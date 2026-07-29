export const actionCriarServico = async (payload) => {
  // ... outras validações ...
  
  const { data, error } = await supabase.from('servicos').insert([{
    nome: payload.nome,
    tipo: payload.tipo,
    preco: payload.preco,
    dias_bloqueio_padrao: payload.dias_bloqueio_padrao,
    tipo_contagem_dias: payload.tipo_contagem_dias,
    ativo: payload.ativo,
    especialidade: payload.especialidade // <--- ADICIONE ESTA LINHA
  }]);

  if (error) throw error;
  return data;
};