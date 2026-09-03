'use client';

import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

type Driver = {
  id: string;
  nome: string;
  cpf: string;
  cnh: string;
  categoria_cnh: string;
  telefone: string;
  ativo: boolean;
  criado_em: string;
};

type Trip = {
  id: number;
  motorista_cpf: string;
  origem: string;
  destino: string;
  data_saida: string;
  data_retorno: string | null;
  km_inicial: number;
  km_final: number | null;
  status: string;
};

export default function Home() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 10;

  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    cnh: '',
    categoria_cnh: 'B',
    telefone: '',
    ativo: true,
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripForm, setTripForm] = useState({
    origem: '',
    destino: '',
    data_saida: '',
    km_inicial: '',
  });

  async function loadDrivers() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API}/motoristas?page=${page}&limit=${limit}&busca=${search}`,
      );
      if (!res.ok) throw new Error('Erro ao carregar motoristas');
      const json = await res.json();
      setDrivers(json.data);
      setTotal(json.total);
    } catch (e) {
      setError('Nao foi possivel conectar a API. Ela esta rodando na porta 3001?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrivers();
  }, [page, search]);

  async function saveDriver() {
    setFormError('');

    if (form.nome.trim() === '') {
      setFormError('Nome e obrigatorio');
      return;
    }
    if (!editing && form.cpf.replace(/\D/g, '').length !== 11) {
      setFormError('CPF deve ter 11 digitos');
      return;
    }

    try {
      const url = editing ? `${API}/motoristas/${editing}` : `${API}/motoristas`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.message || 'Erro ao salvar');
        return;
      }
      setForm({
        nome: '',
        cpf: '',
        cnh: '',
        categoria_cnh: 'B',
        telefone: '',
        ativo: true,
      });
      setEditing(null);
      loadDrivers();
    } catch {
      setFormError('Erro de conexao com a API');
    }
  }

  async function deleteDriver(id: string, nome: string) {
    if (!confirm(`Excluir o motorista ${nome}?`)) return;
    try {
      const res = await fetch(`${API}/motoristas/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.message || 'Erro ao excluir');
        return;
      }
      loadDrivers();
    } catch {
      alert('Erro de conexao com a API');
    }
  }

  function startEdit(driver: Driver) {
    setEditing(driver.id);
    setForm({
      nome: driver.nome,
      cpf: driver.cpf,
      cnh: driver.cnh,
      categoria_cnh: driver.categoria_cnh,
      telefone: driver.telefone,
      ativo: driver.ativo,
    });
    setFormError('');
  }

  async function openTrips(driver: Driver) {
    setSelectedDriver(driver);
    const res = await fetch(`${API}/motoristas/${driver.id}/viagens`);
    setTrips(await res.json());
  }

  async function createTrip() {
    if (!selectedDriver) return;
    try {
      const res = await fetch(`${API}/viagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motorista_cpf: selectedDriver.cpf,
          origem: tripForm.origem,
          destino: tripForm.destino,
          data_saida: tripForm.data_saida,
          km_inicial: tripForm.km_inicial,
          status: 'PLANEJADA',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.message || 'Erro ao criar viagem');
        return;
      }
      setTripForm({ origem: '', destino: '', data_saida: '', km_inicial: '' });
      openTrips(selectedDriver);
    } catch {
      alert('Erro de conexao com a API');
    }
  }

  async function finishTrip(trip: Trip) {
    const returnDate = prompt('Data de retorno (AAAA-MM-DDTHH:mm:00):');
    if (!returnDate) return;
    const endKm = prompt('Km final:');
    if (!endKm) return;

    try {
      const res = await fetch(`${API}/viagens/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_retorno: returnDate,
          km_final: Number(endKm),
          status: 'CONCLUIDA',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.message || 'Erro ao concluir viagem');
        return;
      }
      if (selectedDriver) openTrips(selectedDriver);
    } catch {
      alert('Erro de conexao com a API');
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <main style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Controle de Frota</h1>

      <section style={{ marginBottom: 30, border: '1px solid #ccc', padding: 15 }}>
        <h2>{editing ? 'Editar motorista' : 'Novo motorista'}</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <input
            placeholder="CPF"
            value={form.cpf}
            disabled={editing !== null}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
          />
          <input
            placeholder="CNH"
            value={form.cnh}
            onChange={(e) => setForm({ ...form, cnh: e.target.value })}
          />
          <select
            value={form.categoria_cnh}
            onChange={(e) =>
              setForm({ ...form, categoria_cnh: e.target.value })
            }
          >
            <option>A</option>
            <option>B</option>
            <option>C</option>
            <option>D</option>
            <option>E</option>
          </select>
          <input
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Ativo
          </label>
          <button onClick={saveDriver}>{editing ? 'Salvar' : 'Criar'}</button>
          {editing && (
            <button
              onClick={() => {
                setEditing(null);
                setForm({
                  nome: '',
                  cpf: '',
                  cnh: '',
                  categoria_cnh: 'B',
                  telefone: '',
                  ativo: true,
                });
              }}
            >
              Cancelar
            </button>
          )}
        </div>
        {formError && <p style={{ color: 'red' }}>{formError}</p>}
      </section>

      <section>
        <h2>Motoristas</h2>
        <input
          placeholder="Buscar por nome ou CPF"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ marginBottom: 10, width: 300 }}
        />

        {loading && <p>Carregando...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && drivers.length === 0 && (
          <p>Nenhum motorista encontrado</p>
        )}

        {!loading && !error && drivers.length > 0 && (
          <>
            <table border={1} cellPadding={5} style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>CNH</th>
                  <th>Cat.</th>
                  <th>Telefone</th>
                  <th>Ativo</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td>{d.nome}</td>
                    <td>{d.cpf}</td>
                    <td>{d.cnh}</td>
                    <td>{d.categoria_cnh}</td>
                    <td>{d.telefone}</td>
                    <td>{d.ativo ? 'Sim' : 'Nao'}</td>
                    <td>
                      <button onClick={() => startEdit(d)}>Editar</button>
                      <button onClick={() => deleteDriver(d.id, d.nome)}>
                        Excluir
                      </button>
                      <button onClick={() => openTrips(d)}>Viagens</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 10 }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </button>
              <span style={{ margin: '0 10px' }}>
                Pagina {page} de {totalPages} ({total} registros)
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Proxima
              </button>
            </div>
          </>
        )}
      </section>

      {selectedDriver && (
        <section style={{ marginTop: 30, border: '1px solid #ccc', padding: 15 }}>
          <h2>Viagens de {selectedDriver.nome}</h2>
          <button onClick={() => setSelectedDriver(null)}>Fechar</button>

          <h3>Nova viagem</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              placeholder="Origem"
              value={tripForm.origem}
              onChange={(e) =>
                setTripForm({ ...tripForm, origem: e.target.value })
              }
            />
            <input
              placeholder="Destino"
              value={tripForm.destino}
              onChange={(e) =>
                setTripForm({ ...tripForm, destino: e.target.value })
              }
            />
            <input
              placeholder="Data saida (2025-07-01T08:00:00)"
              value={tripForm.data_saida}
              onChange={(e) =>
                setTripForm({ ...tripForm, data_saida: e.target.value })
              }
            />
            <input
              placeholder="Km inicial"
              value={tripForm.km_inicial}
              onChange={(e) =>
                setTripForm({ ...tripForm, km_inicial: e.target.value })
              }
            />
            <button onClick={createTrip}>Criar viagem</button>
          </div>

          {trips.length === 0 ? (
            <p>Nenhuma viagem para este motorista</p>
          ) : (
            <table
              border={1}
              cellPadding={5}
              style={{ borderCollapse: 'collapse', marginTop: 10 }}
            >
              <thead>
                <tr>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Saida</th>
                  <th>Retorno</th>
                  <th>Km ini</th>
                  <th>Km fim</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td>{t.origem}</td>
                    <td>{t.destino}</td>
                    <td>{t.data_saida}</td>
                    <td>{t.data_retorno || '-'}</td>
                    <td>{t.km_inicial}</td>
                    <td>{t.km_final ?? '-'}</td>
                    <td>{t.status}</td>
                    <td>
                      {t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA' && (
                        <button onClick={() => finishTrip(t)}>Concluir</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}