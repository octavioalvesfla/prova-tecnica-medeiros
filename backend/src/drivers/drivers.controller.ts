import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { DriversService } from './drivers.service';

@Controller('motoristas')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.driversService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Get(':id/viagens')
  findTrips(@Param('id') id: string) {
    return this.driversService.findTrips(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.driversService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.driversService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }
}