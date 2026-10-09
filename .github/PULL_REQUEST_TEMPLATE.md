## 🎯 Resumo da Modificação
Breve descrição das alterações implementadas neste PR.

## 🔗 Issue Relacionada
Fixes # (ou Closes #)

## 📋 Checklist de Qualidade e Segurança (Obrigatório)
- [ ] **Lógica de Negócios**: 100% mantida e sem quebra de fluxos existentes
- [ ] **Isolamento de Tenant**: Todas as consultas ao banco incluem `.eq("empresa_id", ...)`
- [ ] **Zero Data Loss**: Nenhuma tabela ou dado existente foi apagado
- [ ] **Proteção de Segredos**: Nenhuma chave privada ou credencial foi comitada
- [ ] **Segurança de Sessão**: Nenhuma senha ou CPF gravado em texto puro ou `localStorage`
- [ ] **Testes**: Executados e aprovados com sucesso

## 🧪 Como Testar as Mudanças
1. Passo a passo para validar localmente:
2. Cenários de teste verificados:
