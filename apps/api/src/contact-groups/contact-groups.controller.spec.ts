import { Test, TestingModule } from '@nestjs/testing';
import { ContactGroupsController } from './contact-groups.controller';

describe('ContactGroupsController', () => {
  let controller: ContactGroupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactGroupsController],
    }).compile();

    controller = module.get<ContactGroupsController>(ContactGroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
