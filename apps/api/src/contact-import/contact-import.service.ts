
import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { parse as parseCsv } from 'csv-parse/sync';
import readXlsxFile from 'read-excel-file/node';
import type { Express } from 'express';

type ImportRow = Record<string, unknown>;

type ValidatedContact = {
    rowNumber: number;
    status: 'valid' | 'invalid' | 'duplicate';
    errors: string[];
    firstName: string;
    lastName: string | null;
    email: string | null;
    mobile: string | null;
    whatsappConsent: false;
    smsConsent: false;
    emailConsent: false;
};

type ValidationResult = {
    validatedRows: ValidatedContact[];
    response: {
        message: string;
        fileName: string;
        totalRows: number;
        summary: {
            valid: number;
            duplicate: number;
            invalid: number;
        };
        preview: ValidatedContact[];
        issues: ValidatedContact[];
    };
};

@Injectable()
export class ContactImportService {
    constructor(private readonly prisma: PrismaService) { }

    private async verifyBrandAccess(
        userId: string,
        brandId: string,
    ) {
        const brand = await this.prisma.brand.findFirst({
            where: {
                id: brandId,
                account: {
                    members: {
                        some: { userId },
                    },
                },
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!brand) {
            throw new NotFoundException('Brand not found');
        }

        if (!brand.isActive) {
            throw new BadRequestException('Brand is inactive');
        }

        return brand;
    }


    private async verifyContactGroup(
        brandId: string,
        groupId?: string,
    ) {
        if (!groupId) {
            return null;
        }

        const group = await this.prisma.contactGroup.findFirst({
            where: {
                id: groupId,
                brandId,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (!group) {
            throw new NotFoundException(
                'Contact group not found or inactive for this brand',
            );
        }

        return group;
    }


    // Validate a file without inserting contacts.

    async uploadFile(
        userId: string,
        brandId: string,
        file: Express.Multer.File,
        groupId?: string,
    ) {
        const result = await this.validateFile(
            userId,
            brandId,
            file,
            groupId,
        );

        return result.response;
    }


    // Validate the file again, then insert only valid contacts.

    async importFile(
        userId: string,
        brandId: string,
        file: Express.Multer.File,
        groupId?: string,
    ) {
        const result = await this.validateFile(
            userId,
            brandId,
            file,
            groupId,
        );

        const validRows = result.validatedRows.filter(
            (row) => row.status === 'valid',
        );

        if (validRows.length === 0) {
            return {
                message: 'No valid contacts available to import',
                fileName: file.originalname,
                groupId: groupId ?? null,
                summary: {
                    totalRows: result.response.totalRows,
                    imported: 0,
                    assignedToGroup: 0,
                    duplicate: result.response.summary.duplicate,
                    invalid: result.response.summary.invalid,
                },
                issues: result.response.issues,
            };
        }

        // Create contacts and group memberships atomically.
        const importedCount = await this.prisma.$transaction(
            async (tx) => {
                const createdContacts =
                    await tx.contact.createManyAndReturn({
                        data: validRows.map((row) => ({
                            brandId,
                            firstName: row.firstName,
                            lastName: row.lastName,
                            email: row.email,
                            mobile: row.mobile,
                            whatsappConsent: false,
                            smsConsent: false,
                            emailConsent: false,
                        })),
                        skipDuplicates: true,
                        select: {
                            id: true,
                        },
                    });

                if (groupId && createdContacts.length > 0) {
                    await tx.contactGroupMember.createMany({
                        data: createdContacts.map((contact) => ({
                            groupId,
                            contactId: contact.id,
                        })),
                        skipDuplicates: true,
                    });
                }

                return createdContacts.length;
            },
        );

        const skippedDuplicates =
            validRows.length - importedCount;

        return {
            message: 'Contact import completed',
            fileName: file.originalname,
            groupId: groupId ?? null,
            summary: {
                totalRows: result.response.totalRows,
                imported: importedCount,
                assignedToGroup: groupId ? importedCount : 0,
                duplicate:
                    result.response.summary.duplicate +
                    skippedDuplicates,
                invalid: result.response.summary.invalid,
            },
            issues: result.response.issues,
        };
    }


    // Shared file validation used by preview and import endpoints.

    private async validateFile(
        userId: string,
        brandId: string,
        file: Express.Multer.File,
        groupId?: string,
    ): Promise<ValidationResult> {
        await this.verifyBrandAccess(userId, brandId);
        await this.verifyContactGroup(brandId, groupId);

        const extension = file.originalname
            .toLowerCase()
            .slice(file.originalname.lastIndexOf('.'));

        if (extension === '.csv') {
            return this.parseCsvFile(file, brandId);
        }

        if (extension === '.xlsx') {
            return this.parseExcelFile(file, brandId);
        }

        throw new BadRequestException(
            'Only CSV and XLSX files are supported',
        );
    }


    private async parseCsvFile(
        file: Express.Multer.File,
        brandId: string,
    ): Promise<ValidationResult> {
        try {
            if (file.buffer.includes(0)) {
                throw new BadRequestException('Invalid CSV file');
            }

            const rows = parseCsv(file.buffer, {
                bom: true,
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: false,
                max_record_size: 10000,
                to: 5001,
            }) as ImportRow[];

            if (rows.length > 5000) {
                throw new BadRequestException(
                    'Maximum 5000 contact rows are allowed',
                );
            }

            return this.validateRows(
                rows,
                file.originalname,
                brandId,
            );
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException(
                'Unable to parse CSV file. Please check its format and headers.',
            );
        }
    }

    private async parseExcelFile(
        file: Express.Multer.File,
        brandId: string,
    ): Promise<ValidationResult> {
        try {
            const signature = file.buffer.subarray(0, 4);

            if (
                signature[0] !== 0x50 ||
                signature[1] !== 0x4b
            ) {
                throw new BadRequestException('Invalid XLSX file');
            }

            const sheets = await readXlsxFile(file.buffer);

            if (sheets.length === 0) {
                throw new BadRequestException(
                    'Excel file has no worksheets',
                );
            }

            const rows: unknown[][] = sheets[0].data;

            if (rows.length > 5001) {
                throw new BadRequestException(
                    'Maximum 5000 contact rows are allowed',
                );
            }

            if (rows.length < 2) {
                throw new BadRequestException(
                    'Excel file must contain headers and at least one data row',
                );
            }

            const headers = rows[0].map((header) =>
                String(header ?? '').trim(),
            );

            if (
                headers.some((header) => !header) ||
                new Set(headers.map((header) => header.toLowerCase()))
                    .size !== headers.length
            ) {
                throw new BadRequestException(
                    'Excel file contains empty or duplicate column headers',
                );
            }

            const records: ImportRow[] = rows.slice(1).map((row) => {
                const record: ImportRow = {};

                headers.forEach((header, index) => {
                    record[header] = row[index] ?? '';
                });

                return record;
            });

            return this.validateRows(
                records,
                file.originalname,
                brandId,
            );
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException(
                'Unable to parse XLSX file. Please check its format.',
            );
        }
    }

    private async validateRows(
        rows: ImportRow[],
        fileName: string,
        brandId: string,
    ): Promise<ValidationResult> {
        if (rows.length === 0) {
            throw new BadRequestException(
                'File does not contain any contact records',
            );
        }

        const headers = Object.keys(rows[0]).map((header) =>
            header.trim().toLowerCase(),
        );

        if (!headers.includes('firstname')) {
            throw new BadRequestException(
                'Missing required column: firstName',
            );
        }

        if (
            !headers.includes('mobile') &&
            !headers.includes('email')
        ) {
            throw new BadRequestException(
                'File must contain a mobile or email column',
            );
        }

        const getValue = (
            row: ImportRow,
            column: string,
        ): string => {
            const key = Object.keys(row).find(
                (header) => header.trim().toLowerCase() === column,
            );

            const value = key ? row[key] : '';

            return String(value ?? '').trim();
        };

        const normalizedRows = rows.map((row, index) => ({
            rowNumber: index + 2,
            firstName: getValue(row, 'firstname'),
            lastName: getValue(row, 'lastname') || null,
            email: getValue(row, 'email').toLowerCase() || null,
            mobile: getValue(row, 'mobile') || null,
        }));

        const mobiles = [
            ...new Set(
                normalizedRows
                    .map((row) => row.mobile)
                    .filter((mobile): mobile is string => mobile !== null),
            ),
        ];

        const existingContacts = mobiles.length
            ? await this.prisma.contact.findMany({
                where: {
                    brandId,
                    mobile: { in: mobiles },
                },
                select: {
                    mobile: true,
                },
            })
            : [];

        const existingMobiles = new Set(
            existingContacts
                .map((contact) => contact.mobile)
                .filter((mobile): mobile is string => mobile !== null),
        );

        const seenMobiles = new Set<string>();

        const validatedRows: ValidatedContact[] =
            normalizedRows.map((row) => {
                const errors: string[] = [];

                if (!row.firstName) {
                    errors.push('First name is required');
                } else if (
                    row.firstName.length < 2 ||
                    row.firstName.length > 100
                ) {
                    errors.push(
                        'First name must contain 2 to 100 characters',
                    );
                }

                if (
                    row.lastName &&
                    row.lastName.length > 100
                ) {
                    errors.push(
                        'Last name cannot exceed 100 characters',
                    );
                }

                if (
                    row.email &&
                    (
                        row.email.length > 255 ||
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
                    )
                ) {
                    errors.push('Invalid email address');
                }

                if (
                    row.mobile &&
                    !/^\+[1-9]\d{7,14}$/.test(row.mobile)
                ) {
                    errors.push(
                        'Mobile must be in E.164 format, e.g. +919876543210',
                    );
                }

                if (!row.mobile && !row.email) {
                    errors.push(
                        'At least one mobile number or email is required',
                    );
                }

                let isDuplicate = false;

                if (
                    row.mobile &&
                    /^\+[1-9]\d{7,14}$/.test(row.mobile)
                ) {
                    if (existingMobiles.has(row.mobile)) {
                        isDuplicate = true;
                        errors.push(
                            'Mobile number already exists in this brand',
                        );
                    } else if (seenMobiles.has(row.mobile)) {
                        isDuplicate = true;
                        errors.push(
                            'Duplicate mobile number in uploaded file',
                        );
                    }

                    seenMobiles.add(row.mobile);
                }

                const status: ValidatedContact['status'] =
                    errors.length > 0
                        ? isDuplicate
                            ? 'duplicate'
                            : 'invalid'
                        : 'valid';

                return {
                    ...row,
                    status,
                    errors,
                    whatsappConsent: false,
                    smsConsent: false,
                    emailConsent: false,
                };
            });

        const validCount = validatedRows.filter(
            (row) => row.status === 'valid',
        ).length;

        const duplicateCount = validatedRows.filter(
            (row) => row.status === 'duplicate',
        ).length;

        const invalidCount = validatedRows.filter(
            (row) => row.status === 'invalid',
        ).length;

        return {
            validatedRows,
            response: {
                message: 'Contact validation completed',
                fileName,
                totalRows: validatedRows.length,
                summary: {
                    valid: validCount,
                    duplicate: duplicateCount,
                    invalid: invalidCount,
                },
                preview: validatedRows.slice(0, 20),
                issues: validatedRows.filter(
                    (row) => row.status !== 'valid',
                ),
            },
        };
    }
}
