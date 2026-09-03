import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DatabaseService } from '../database/database.service';

@Module({
  controllers: [DriversController],
  providers: [DriversService, DatabaseService],
})
export class DriversModule {}