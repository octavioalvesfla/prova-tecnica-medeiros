import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface Driver {
  id: string;
  nome: string;
  cpf: string;
  cnh: string;
  categoria_cnh: string;
  telefone: string;
  ativo: boolean;
  criado_em: string;
}

export interface Trip {
  id: number;
  motorista_cpf: string;
  origem: string;
  destino: string;
  data_saida: string;
  data_retorno: string | null;
  km_inicial: number;
  km_final: number | null;
  status: string;
}

export interface Database {
  motoristas: Driver[];
  viagens: Trip[];
}

@Injectable()
export class DatabaseService {
  private readonly filePath = path.resolve(__dirname, '..', '..', 'dados.json');

  read(): Database {
    if (!fs.existsSync(this.filePath)) {
      return { motoristas: [], viagens: [] };
    }
    const content = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(content) as Database;
  }

  write(data: Database): void {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}