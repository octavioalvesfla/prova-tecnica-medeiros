import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { DatabaseService } from '../database/database.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, DatabaseService],
})
export class TripsModule {}