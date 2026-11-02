import { Test, TestingModule } from '@nestjs/testing';
import { ContactGroupsService } from './contact-groups.service';

describe('ContactGroupsService', () => {
  let service: ContactGroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactGroupsService],
    }).compile();

    service = module.get<ContactGroupsService>(ContactGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
