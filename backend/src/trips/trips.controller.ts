import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { TripsService } from './trips.service';

@Controller('viagens')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.tripsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.tripsService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.tripsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.remove(id);
  }
}
