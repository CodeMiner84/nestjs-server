import { Injectable, Inject } from '@nestjs/common';
import { CART_REPOSITORY } from '../constants';
import { CartItem } from '../entity/cart.entity';
import { DeleteResult } from 'typeorm';
import { CartItemRepository } from '../entity/cart.repository';
import { Product } from 'src/product/entity/product.entity';
import { User } from 'src/user/entity/user.entity';
import { CreateCartItem } from '../dto/create-cartitem.dto';
import { RecalculateProps } from '../dto/recalulate-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartItemRepository,
  ) {}

  async getCartItems(): Promise<CartItem[]> {
    return await this.cartRepository.find();
  }

  async itemExists(product: Product, user?: User): Promise<CartItem> {
    return await this.cartRepository.findOne({
      product,
      user,
    });
  }

  async findUserProduct(product: Product, user: User): Promise<CartItem> {
    return await this.cartRepository.findOne({
      product,
      user,
    });
  }

  async removeById(product: Product, user: User): Promise<DeleteResult> {
    const cartItem = await this.findUserProduct(product, user);
    return await this.cartRepository.removeCartItem(cartItem);
  }

  async addToCart(params: CreateCartItem, user: User): Promise<boolean> {
    const exists = await this.itemExists(params.product, user);
    if (exists) {
      await this.cartRepository.update(
        {id: exists.id},
        {quantity: exists.quantity + params.quantity},
      );

      return true;
    }

    this.cartRepository.save({
      ...params,
      user,
      product: params.product,
    });

    return true;
  }

  async recalculate(params: RecalculateProps, user: User): Promise<void> {
    await this.cartRepository.update(
      {id: params.id, user},
      {quantity: params.quantity},
    );
  }
}
