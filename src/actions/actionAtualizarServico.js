export const actionAtualizarServico = async (id, payload) => {
  // ... outras validações ...

  const { data, error } = await supabase.from('servicos').update({
    nome: payload.nome,
    tipo: payload.tipo,
    preco: payload.preco,
    dias_bloqueio_padrao: payload.dias_bloqueio_padrao,
    tipo_contagem_dias: payload.tipo_contagem_dias,
    ativo: payload.ativo,
    especialidade: payload.especialidade // <--- ADICIONE ESTA LINHA AQUI TAMBÉM
  }).eq('id', id);

  if (error) throw error;
  return data;
};