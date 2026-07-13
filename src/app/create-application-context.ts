import 'reflect-metadata';

import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

export async function createRepoNavApplicationContext(): Promise<INestApplicationContext> {
  return await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
}
