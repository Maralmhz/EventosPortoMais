export const COTAS = {
  'LIMA TRUCK': {
    color: '🔵',
    categorias: {
      'Automóveis até 60 mil': { cota: '6% FIPE', minimo: '1,5 salário' },
      'Automóveis 60 a 260 mil': { cota: '7% FIPE', minimo: '1,5 salário' },
      'Diesel / Utilitários / Ônibus': { cota: '8% FIPE', minimo: 'R$ 5.000' },
      'Táxi / Uber': { cota: '7% FIPE', minimo: '1,5 salário' },
      'Moto': { cota: '10% FIPE', minimo: '1 salário' }
    }
  },
  'PORTO MAIS': {
    color: '🟢',
    categorias: {
      'Veículos passeio': { cota: '4% FIPE', minimo: '1 salário' },
      'Utilitários': { cota: '6% FIPE', minimo: '1 salário' },
      'Categoria especial': { cota: '8% FIPE', minimo: '2 salários' },
      'Caminhão': { cota: '8% FIPE', minimo: '3 salários' },
      'Moto': { cota: '6% FIPE', minimo: '1 salário' },
      'Moto acima 400cc': { cota: '10% FIPE', minimo: '1 salário' }
    }
  },
  'GRAND CAR': {
    color: '🟡',
    categorias: {
      'Passeio até 80 mil': { cota: '4% FIPE', minimo: 'R$ 900' },
      '80 a 100 mil': { cota: '6% FIPE', minimo: 'R$ 900' },
      'Acima de 100 mil': { cota: '8% FIPE', minimo: 'R$ 900' },
      'Táxi / App': { cota: '8% FIPE', minimo: 'R$ 1.500' },
      'Moto': { cota: '6% FIPE', minimo: 'R$ 900' }
    }
  },
  'STATUS': {
    color: '🔴',
    categorias: {
      'Passeio até 10 mil': { cota: '10% FIPE', minimo: 'R$ 800' },
      'Acima de 10 mil': { cota: '10% FIPE', minimo: 'R$ 1.200' },
      'Grupo especial 2': { cota: '15% FIPE', minimo: 'R$ 1.500' },
      'Grupo especial 3': { cota: '21% FIPE', minimo: 'R$ 2.500' },
      'Moto': { cota: '21% FIPE', minimo: 'R$ 1.500' },
      'Terceiros': { cota: '50% da cota', minimo: '-' }
    }
  },
  'FR BRASIL': {
    color: '⚫',
    categorias: {
      'Automóveis até 40 mil': { cota: '4% FIPE', minimo: 'R$ 800' },
      '40 a 100 mil': { cota: '5% FIPE', minimo: 'R$ 800' },
      'Táxi / Uber até 40 mil': { cota: '6% FIPE', minimo: 'R$ 1.500' },
      'Táxi / Uber 40 a 100 mil': { cota: '7% FIPE', minimo: 'R$ 1.500' },
      'Diesel até 60 mil': { cota: '7% FIPE', minimo: 'R$ 1.500' },
      'Diesel 60 a 120 mil': { cota: '8% FIPE', minimo: 'R$ 1.500' },
      'Moto até 120cc': { cota: 'Valor fixo', minimo: 'R$ 600' },
      'Moto até 160cc': { cota: 'Valor fixo', minimo: 'R$ 800' },
      'Moto até 250cc': { cota: 'Valor fixo', minimo: 'R$ 900' },
      'Moto até 300cc': { cota: 'Valor fixo', minimo: 'R$ 1.100' },
      'Terceiro moto': { cota: '50% da cota', minimo: '-' }
    }
  }
}

export const SALARIO_MINIMO = 1412 // 2026
