import React, { useState, useEffect } from 'react'
import { COTAS, SALARIO_MINIMO } from '../utils/cotasData'
import { supabase } from '../supabase/config'

const CotaSimulator = () => {
  const [formData, setFormData] = useState({
    placa: '',
    fipeValue: '',
    associacao: '',
    categoria: '',
    cpf: '',
    temVidro: false,
    dataAnterior: ''
  })
  const [resultado, setResultado] = useState(null)
  const [reincidencia, setReincidencia] = useState(false)
  const [salarioInput, setSalarioInput] = useState(SALARIO_MINIMO)

  useEffect(() => {
    // Checa reincidência automática por CPF
    const checkReincidencia = async () => {
      if (formData.cpf) {
        const { data } = await supabase
          .from('historico_reincidencia')
          .select('*')
          .gte('data_evento', new Date(Date.now() - 12*30*24*60*60*1000).toISOString())
          .eq('cpf', formData.cpf)
        setReincidencia(data?.length > 0)
      }
    }
    checkReincidencia()
  }, [formData.cpf])

  const calcularCota = () => {
    const fipe = parseFloat(formData.fipeValue)
    const config = COTAS[formData.associacao]?.categorias[formData.categoria]
    if (!config || !fipe) return

    let cotaBase = 0
    const percentMatch = config.cota.match(/(\d+)% FIPE/)
    if (percentMatch) {
      cotaBase = (fipe * parseInt(percentMatch[1])) / 100
    } else if (config.cota === 'Valor fixo') {
      cotaBase = parseFloat(config.minimo.replace('R$ ', '').replace('.', '').replace(',', '.'))
    }

    // Aplica mínimo
    const minimoStr = config.minimo
    let minimo = 0
    if (minimoStr.includes('salário')) {
      const qtdSalarios = parseFloat(minimoStr) || 1
      minimo = salarioInput * qtdSalarios
    } else {
      minimo = parseFloat(minimoStr.replace('R$ ', '').replace('.', '').replace(',', '.'))
    }
    
    const cotaFinal = Math.max(cotaBase, minimo)
    const cotaReincidencia = reincidencia ? cotaFinal * 2 : cotaFinal
    const vidroValue = formData.temVidro ? cotaReincidencia * 0.5 : 0
    
    setResultado({
      cotaBase: cotaFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      cotaReincidencia: cotaReincidencia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      vidro: vidroValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      total: (cotaReincidencia + vidroValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      reincidencia,
      podeAprovar: cotaReincidencia <= 5000 // Regra negócio
    })
  }

  const salvarEvento = async () => {
    if (!resultado || !formData.cpf) return
    const { error } = await supabase.from('eventos').insert({
      cliente_cpf: formData.cpf,
      placa: formData.placa,
      fipe_value: parseFloat(formData.fipeValue),
      associacao: formData.associacao,
      categoria: formData.categoria,
      cota_base: parseFloat(resultado.cotaBase.replace('R$', '').replace('.', '').replace(',', '.')),
      vidro: formData.temVidro,
      reincidencia,
      status: resultado.podeAprovar ? 'aprovado' : 'analisar'
    })
    if (!error) alert('Evento salvo!')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        🚗 Simulador Cota de Participação
      </h1>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-semibold mb-6">📝 Dados do Evento</h2>
          
          <div className="space-y-4">
            <input
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="Placa do veículo"
              value={formData.placa}
              onChange={(e) => setFormData({...formData, placa: e.target.value})}
            />
            
            <input
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="Valor FIPE (R$)"
              value={formData.fipeValue}
              onChange={(e) => setFormData({...formData, fipeValue: e.target.value})}
            />
            
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              value={formData.associacao}
              onChange={(e) => {
                setFormData({...formData, associacao: e.target.value, categoria: ''})
              }}
            >
              <option value="">Selecione associação</option>
              {Object.entries(COTAS).map(([key]) => (
                <option key={key} value={key}>{COTAS[key].color} {key}</option>
              ))}
            </select>
            
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
            >
              <option value="">
                {formData.associacao ? 'Selecione categoria' : 'Primeiro assoc.'}
              </option>
              {formData.associacao && Object.entries(COTAS[formData.associacao].categorias).map(([cat]) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <input
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="CPF Cliente (reincidência auto)"
              value={formData.cpf}
              onChange={(e) => setFormData({...formData, cpf: e.target.value})}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-semibold mb-6">⚙️ Regras Aplicadas</h2>
          
          <div className="space-y-4 text-lg">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.temVidro}
                onChange={(e) => setFormData({...formData, temVidro: e.target.checked})}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>🔲 Vidro (50% cota)</span>
            </label>
            
            <div className={`p-3 rounded-xl ${reincidencia ? 'bg-red-100 border-2 border-red-400' : 'bg-gray-100'}`}>
              <label className="flex items-center justify-between">
                <span>🔄 Reincidência &lt; 12 meses</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  reincidencia ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                }`}>
                  {reincidencia ? 'SIM - DOBRA COTA' : 'NÃO'}
                </span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">💰 Salário Base</label>
              <input
                type="number"
                value={salarioInput}
                onChange={(e) => setSalarioInput(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={calcularCota}
          className="px-12 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-lg rounded-2xl shadow-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
        >
          🧮 Calcular Cota
        </button>
        
        {resultado && (
          <button
            onClick={salvarEvento}
            className="px-12 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-lg rounded-2xl shadow-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300"
          >
            💾 Salvar Evento
          </button>
        )}
      </div>

      {resultado && (
        <div className="mt-12 bg-white p-8 rounded-3xl shadow-2xl border-4 border-blue-200">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">📊 Resultado da Cota</h2>
          
          <div className="grid md:grid-cols-2 gap-6 text-center">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
              <div className="text-4xl font-bold text-blue-600 mb-2">{resultado.cotaBase}</div>
              <div className="text-lg text-gray-600">Cota Base</div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl">
              <div className="text-4xl font-bold text-orange-600 mb-2">{resultado.vidro}</div>
              <div className="text-lg text-gray-600">Vidro (50%)</div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl md:col-span-2">
              <div className="text-5xl font-black text-red-600 mb-2">{resultado.cotaReincidencia}</div>
              <div className="text-xl text-gray-700">
                {reincidencia ? 'Cota DOBRADA (Reincidência)' : 'Cota Final'}
              </div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl md:col-span-2">
              <div className="text-6xl font-black text-indigo-700 mb-2">
                {resultado.total}
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-4">TOTAL A PAGAR</div>
              <div className={`text-lg font-bold px-6 py-2 rounded-full ${
                resultado.podeAprovar 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-amber-500 text-white'
              }`}>
                {resultado.podeAprovar ? '✅ APROVAR AUTOMATICO' : '⚠️ ANALISAR MANUAL'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CotaSimulator
