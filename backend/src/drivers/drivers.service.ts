import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService, Driver } from '../database/database.service';
import { normalizeCpf } from '../common/normalizers';

@Injectable()
export class DriversService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query: {
    page?: string;
    limit?: string;
    busca?: string;
    ativo?: string;
    ordenarPor?: string;
    ordem?: string;
  }) {
    const data = this.db.read();
    let result = [...data.motoristas];

    if (query.busca) {
      const term = query.busca.toLowerCase();
      result = result.filter(
        (d) =>
          d.nome.toLowerCase().includes(term) || d.cpf.includes(term),
      );
    }

    if (query.ativo !== undefined && query.ativo !== '') {
      const wanted = query.ativo === 'true';
      result = result.filter((d) => d.ativo === wanted);
    }

    const sortField = query.ordenarPor || 'nome';
    const direction = query.ordem === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      const valueA = String(a[sortField as keyof Driver] ?? '');
      const valueB = String(b[sortField as keyof Driver] ?? '');
      return valueA.localeCompare(valueB) * direction;
    });

    const total = result.length;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const start = (page - 1) * limit;

    return {
      total,
      page,
      limit,
      data: result.slice(start, start + limit),
    };
  }

  findOne(id: string): Driver {
    const data = this.db.read();
    const driver = data.motoristas.find((d) => d.id === id);
    if (!driver) {
      throw new NotFoundException(`Motorista com id ${id} nao encontrado`);
    }
    return driver;
  }

  findTrips(id: string) {
    this.findOne(id);
    const data = this.db.read();
    return data.viagens.filter((t) => t.motorista_cpf === id);
  }

  create(body: any): Driver {
    const data = this.db.read();

    const cpf = normalizeCpf(body.cpf);
    if (cpf === null) {
      throw new BadRequestException('CPF invalido. Deve conter 11 digitos');
    }

    if (data.motoristas.some((d) => d.cpf === cpf)) {
      throw new ConflictException(`Ja existe um motorista com o CPF ${cpf}`);
    }

    const name = String(body.nome || '').trim();
    if (name === '') {
      throw new BadRequestException('Nome e obrigatorio');
    }

    const category = String(body.categoria_cnh || '').trim().toUpperCase();
    if (!['A', 'B', 'C', 'D', 'E'].includes(category)) {
      throw new BadRequestException(
        'Categoria de CNH invalida. Use A, B, C, D ou E',
      );
    }

    const driver: Driver = {
      id: cpf,
      nome: name,
      cpf: cpf,
      cnh: String(body.cnh || '').trim(),
      categoria_cnh: category,
      telefone: String(body.telefone || '').trim(),
      ativo: body.ativo !== undefined ? Boolean(body.ativo) : true,
      criado_em: new Date().toISOString(),
    };

    data.motoristas.push(driver);
    this.db.write(data);
    return driver;
  }

  update(id: string, body: any): Driver {
    const data = this.db.read();
    const index = data.motoristas.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new NotFoundException(`Motorista com id ${id} nao encontrado`);
    }

    const driver = data.motoristas[index];

    if (body.nome !== undefined) {
      const name = String(body.nome).trim();
      if (name === '') {
        throw new BadRequestException('Nome nao pode ser vazio');
      }
      driver.nome = name;
    }

    if (body.categoria_cnh !== undefined) {
      const category = String(body.categoria_cnh).trim().toUpperCase();
      if (!['A', 'B', 'C', 'D', 'E'].includes(category)) {
        throw new BadRequestException(
          'Categoria de CNH invalida. Use A, B, C, D ou E',
        );
      }
      driver.categoria_cnh = category;
    }

    if (body.cnh !== undefined) driver.cnh = String(body.cnh).trim();
    if (body.telefone !== undefined) driver.telefone = String(body.telefone).trim();
    if (body.ativo !== undefined) driver.ativo = Boolean(body.ativo);

    data.motoristas[index] = driver;
    this.db.write(data);
    return driver;
  }

  remove(id: string): { mensagem: string } {
    const data = this.db.read();
    const index = data.motoristas.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new NotFoundException(`Motorista com id ${id} nao encontrado`);
    }

    const tripCount = data.viagens.filter((t) => t.motorista_cpf === id).length;
    if (tripCount > 0) {
      throw new ConflictException(
        `Nao e possivel excluir: o motorista possui ${tripCount} viagem(ns) cadastrada(s)`,
      );
    }

    data.motoristas.splice(index, 1);
    this.db.write(data);
    return { mensagem: 'Motorista removido com sucesso' };
  }
}