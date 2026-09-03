import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService, Trip } from '../database/database.service';
import { normalizeCpf, normalizeStatus } from '../common/normalizers';

@Injectable()
export class TripsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query: { status?: string; inicio?: string; fim?: string }) {
    const data = this.db.read();
    let result = [...data.viagens];

    if (query.status) {
      const status = normalizeStatus(query.status);
      if (status === null) {
        throw new BadRequestException(
          'Status invalido. Use PLANEJADA, EM_ANDAMENTO, CONCLUIDA ou CANCELADA',
        );
      }
      result = result.filter((t) => t.status === status);
    }

    if (query.inicio) {
      result = result.filter((t) => t.data_saida >= query.inicio!);
    }

    if (query.fim) {
      result = result.filter((t) => t.data_saida <= query.fim!);
    }

    return { total: result.length, data: result };
  }

  findOne(id: number): Trip {
    const data = this.db.read();
    const trip = data.viagens.find((t) => t.id === id);
    if (!trip) {
      throw new NotFoundException(`Viagem com id ${id} nao encontrada`);
    }
    return trip;
  }

  create(body: any): Trip {
    const data = this.db.read();

    const cpf = normalizeCpf(body.motorista_cpf);
    if (cpf === null) {
      throw new BadRequestException('CPF do motorista invalido');
    }

    const driver = data.motoristas.find((d) => d.cpf === cpf);
    if (!driver) {
      throw new NotFoundException(`Motorista com CPF ${cpf} nao encontrado`);
    }

    if (!driver.ativo) {
      throw new ConflictException(
        'Motorista inativo nao pode receber uma nova viagem',
      );
    }

    const status = normalizeStatus(body.status || 'PLANEJADA');
    if (status === null) {
      throw new BadRequestException('Status invalido');
    }

    if (status === 'EM_ANDAMENTO') {
      const hasOngoing = data.viagens.some(
        (t) => t.motorista_cpf === cpf && t.status === 'EM_ANDAMENTO',
      );
      if (hasOngoing) {
        throw new ConflictException(
          'Este motorista ja possui uma viagem EM_ANDAMENTO',
        );
      }
    }

    if (!body.data_saida) {
      throw new BadRequestException('data_saida e obrigatoria');
    }

    const departure = String(body.data_saida);
    const returnDate = body.data_retorno ? String(body.data_retorno) : null;

    if (returnDate !== null && returnDate < departure) {
      throw new BadRequestException(
        'data_retorno nao pode ser anterior a data_saida',
      );
    }

    const startKm = Number(body.km_inicial);
    if (isNaN(startKm)) {
      throw new BadRequestException('km_inicial invalido');
    }

    const endKm =
      body.km_final !== undefined && body.km_final !== null
        ? Number(body.km_final)
        : null;

    if (endKm !== null && isNaN(endKm)) {
      throw new BadRequestException('km_final invalido');
    }

    if (endKm !== null && endKm < startKm) {
      throw new BadRequestException(
        'km_final nao pode ser menor que km_inicial',
      );
    }

    if (status === 'CONCLUIDA' && (returnDate === null || endKm === null)) {
      throw new BadRequestException(
        'Para concluir a viagem, data_retorno e km_final sao obrigatorios',
      );
    }

    const nextId =
      data.viagens.length > 0
        ? Math.max(...data.viagens.map((t) => t.id)) + 1
        : 1;

    const trip: Trip = {
      id: nextId,
      motorista_cpf: cpf,
      origem: String(body.origem || '').trim(),
      destino: String(body.destino || '').trim(),
      data_saida: departure,
      data_retorno: returnDate,
      km_inicial: startKm,
      km_final: endKm,
      status: status,
    };

    data.viagens.push(trip);
    this.db.write(data);
    return trip;
  }

  update(id: number, body: any): Trip {
    const data = this.db.read();
    const index = data.viagens.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Viagem com id ${id} nao encontrada`);
    }

    const trip = data.viagens[index];

    if (body.origem !== undefined) trip.origem = String(body.origem).trim();
    if (body.destino !== undefined) trip.destino = String(body.destino).trim();
    if (body.data_saida !== undefined) trip.data_saida = String(body.data_saida);
    if (body.data_retorno !== undefined) {
      trip.data_retorno = body.data_retorno ? String(body.data_retorno) : null;
    }
    if (body.km_inicial !== undefined) trip.km_inicial = Number(body.km_inicial);
    if (body.km_final !== undefined) {
      trip.km_final = body.km_final !== null ? Number(body.km_final) : null;
    }

    if (body.status !== undefined) {
      const status = normalizeStatus(body.status);
      if (status === null) {
        throw new BadRequestException('Status invalido');
      }

      if (status === 'EM_ANDAMENTO' && trip.status !== 'EM_ANDAMENTO') {
        const hasOngoing = data.viagens.some(
          (t) =>
            t.motorista_cpf === trip.motorista_cpf &&
            t.status === 'EM_ANDAMENTO' &&
            t.id !== id,
        );
        if (hasOngoing) {
          throw new ConflictException(
            'Este motorista ja possui uma viagem EM_ANDAMENTO',
          );
        }
      }

      trip.status = status;
    }

    if (trip.data_retorno !== null && trip.data_retorno < trip.data_saida) {
      throw new BadRequestException(
        'data_retorno nao pode ser anterior a data_saida',
      );
    }

    if (trip.km_final !== null && trip.km_final < trip.km_inicial) {
      throw new BadRequestException(
        'km_final nao pode ser menor que km_inicial',
      );
    }

    if (
      trip.status === 'CONCLUIDA' &&
      (trip.data_retorno === null || trip.km_final === null)
    ) {
      throw new BadRequestException(
        'Para concluir a viagem, data_retorno e km_final sao obrigatorios',
      );
    }

    data.viagens[index] = trip;
    this.db.write(data);
    return trip;
  }

  remove(id: number): { mensagem: string } {
    const data = this.db.read();
    const index = data.viagens.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Viagem com id ${id} nao encontrada`);
    }
    data.viagens.splice(index, 1);
    this.db.write(data);
    return { mensagem: 'Viagem removida com sucesso' };
  }
}