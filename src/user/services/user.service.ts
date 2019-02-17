import { Injectable, Inject, forwardRef, HttpException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY, salt } from '../contastants';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../entity/UserRepository';
import { User } from '../entity/user.entity';
import * as uuidv1 from 'uuid/v1';
import { MailerService, MAILER_TEMPLATE_REGISTER } from '../../mailer/services/mailer.service';
import { DuplicateException } from '../../common/exceptions/duplicate-exception';
import { InputUserUpdateModel } from '../dtos/input.user-update.model';
import { AlreadyExistsException } from '../exceptions/already.exist.exception';
import { InputChangePasswordModel } from '../dtos/input.change-password.model';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => MailerService))
    private readonly mailerService: MailerService,
  ) {}

  async findAll(): Promise<User[]> {
     return await this.userRepository.find();
  }

  async create(user: User): Promise<User> {
    const newUser = await this.userRepository.findDuplicate(user.email, user.username);

    if (newUser === undefined) {
      const newUser = await this.userRepository.insert({
        ...user,
        password: bcrypt.hashSync(user.password, salt),
        created: new Date(),
        guid: uuidv1(),
      });

      this.mailerService.sendMail(
        'michal.pietrasz@gmail.com',
        'Registration on jsshop',
        MAILER_TEMPLATE_REGISTER,
        {
          url_activation_link: 'http://google.pl',
        }
      );

      return user;
    } else if (newUser !== null) {
      throw new DuplicateException();
    }

      throw new UnauthorizedException();
  }

  async updateUser(params: InputUserUpdateModel, id: number) {
    if (await this.userRepository.findDuplicateUsername(params.username, id)) {
      throw new AlreadyExistsException();
    }

    this.userRepository.update(
      {id},
      params,
    );
  }

  async findByEmailAndPassword(params: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({ email: params.email });
    if (!user) {
      return null;
    }

    const password = await bcrypt.compare(params.password, user.password);
    if (!password) {
      return null;
    }

    return user;
  }

  async findOneByEmail(email: string): Promise<any> {
    return await this.userRepository.findOneByEmail(email);
  }

  async changePassword(params: InputChangePasswordModel, id: number) {
    const user = await this.userRepository.findOne({ id });
    if (!user) {
      throw new UnauthorizedException();
    }

    const password = await bcrypt.compare(params.oldPassword, user.password);
    if (!password) {
      throw new UnauthorizedException();
    }

    const updateProps = {
      password: bcrypt.hashSync(params.newPassword, salt),
    };

    this.userRepository.update(
      {id},
      updateProps,
    );
  }
}
