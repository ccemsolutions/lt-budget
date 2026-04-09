import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { projectsApi } from '../api/projects'
import { useAuthStore } from '../store/auth'
import type { ProjectRead } from '../types/api'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    archived: 'bg-yellow-100 text-yellow-700',
  }
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    completed: 'Concluído',
    archived: 'Arquivado',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project: ProjectRead) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setShowModal(false)
      navigate(`/projects/${project.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    name: string
    description: string
    voltage_kv: number
  }>()

  const onSubmit = (data: { name: string; description: string; voltage_kv: number }) => {
    createMutation.mutate({ ...data, voltage_kv: Number(data.voltage_kv) })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-700">LT Budget</h1>
            <p className="text-xs text-gray-500">Orçamentos de Linhas de Transmissão</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/catalog')}
              className="text-sm text-gray-500 hover:text-blue-600 font-medium"
            >
              Catálogo CPUs
            </button>
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="text-sm text-gray-500 hover:text-red-600"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Projetos</h2>
          <button
            onClick={() => { reset(); setShowModal(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Novo Projeto
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-500 py-16">Carregando...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg mb-2">Nenhum projeto ainda</p>
            <p className="text-sm">Clique em &ldquo;Novo Projeto&rdquo; para começar</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between hover:shadow-md transition"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    {statusBadge(p.status)}
                  </div>
                  {p.description && <p className="text-sm text-gray-500 mb-1">{p.description}</p>}
                  <p className="text-xs text-gray-400">
                    {p.voltage_kv}kV &bull; Criado em {formatDate(p.created_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Excluir projeto?')) deleteMutation.mutate(p.id)
                  }}
                  className="text-gray-400 hover:text-red-500 ml-4 text-xl leading-none"
                  title="Excluir"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-5">Novo Projeto</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Projeto *</label>
                <input
                  {...register('name', { required: 'Obrigatório' })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="LT 230kV CLA-CAC"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <input
                  {...register('description')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrição opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tensão (kV)</label>
                <input
                  {...register('voltage_kv')}
                  type="number"
                  defaultValue={230}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {createMutation.isError && (
                <p className="text-red-600 text-sm">Erro ao criar projeto. Tente novamente.</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
