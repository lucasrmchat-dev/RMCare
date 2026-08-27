/**
 * Utilitários Universais de Formatação e Validação de Telefones para o RMCare / RMAgenda
 *
 * Padrões Estritos:
 * 1. Envio Push / Webhook / WhatsApp API:
 *    - Padrão: 55 + DDD (2 dígitos) + 8 dígitos (sem o 9º dígito fixo).
 *    - Exemplo: "558494229126" (e NUNCA "5584994229126").
 *    - Regra: SEMPRE FILTRAR, SEMPRE VALIDAR antes de qualquer disparo.
 *
 * 2. Exibição na Interface RMCare / RMAgenda:
 *    - Padrão: Visualização com o dígito 9: "(84) 99422-9126".
 */

/**
 * Formata um número de telefone estritamente para envio PUSH / Webhook / WhatsApp
 * Formato resultante: 55 + DDD (2 dígitos) + 8 dígitos (12 dígitos numéricos no total).
 * Exemplo: (84) 99422-9126 -> 558494229126
 * Exemplo: 5584994229126 -> 558494229126
 * Exemplo: 8494229126 -> 558494229126
 * Exemplo: 558494229126 -> 558494229126
 */
export function formatarTelefoneEnvio(telefone) {
  if (!telefone) return "";
  let digits = String(telefone).replace(/\D/g, "");
  if (!digits) return "";

  // Se já começa com 55 (DDI do Brasil)
  if (digits.startsWith("55")) {
    const sem55 = digits.slice(2);
    // Se tem 11 dígitos (DDD: 2 + 9º dígito + 8 dígitos) -> remove o 9º dígito
    if (sem55.length === 11 && sem55.charAt(2) === "9") {
      return `55${sem55.slice(0, 2)}${sem55.slice(3)}`;
    }
    // Se tem 11 dígitos mas o 3º caractere não é 9 -> pega DDD + últimos 8
    if (sem55.length === 11) {
      return `55${sem55.slice(0, 2)}${sem55.slice(-8)}`;
    }
    // Se tem 10 dígitos (DDD: 2 + 8 dígitos) -> já está no formato correto de 10 dígitos locais
    if (sem55.length === 10) {
      return `55${sem55}`;
    }
    // Se tem mais de 11 dígitos (ex: 55 55 84...)
    if (sem55.length > 11) {
      const ddd = sem55.slice(0, 2);
      const rest = sem55.slice(2);
      if (rest.length === 9 && rest.charAt(0) === "9") {
        return `55${ddd}${rest.slice(1)}`;
      }
      return `55${ddd}${rest.slice(-8)}`;
    }
    // Se tem 8 ou 9 dígitos diretos após 55
    if (sem55.length === 8 || sem55.length === 9) {
      return `55${sem55.length === 9 && sem55.charAt(0) === "9" ? sem55.slice(1) : sem55}`;
    }
    return `55${sem55}`;
  }

  // Se NÃO começa com 55:
  // Se tem 11 dígitos (DDD: 2 + 9º dígito + 8 dígitos) -> ex: 84994229126
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.charAt(0) === "9") {
      return `55${ddd}${rest.slice(1)}`;
    }
    return `55${ddd}${rest.slice(-8)}`;
  }

  // Se tem 10 dígitos (DDD: 2 + 8 dígitos) -> ex: 8494229126
  if (digits.length === 10) {
    return `55${digits}`;
  }

  // Se tem 12 dígitos e começa com 55 (já 55 + DDD + 8 dígitos sem o 9)
  if (digits.length === 12 && digits.startsWith("55")) {
    return digits;
  }

  // Se tem 13 dígitos (55 + DDD + 9 + 8 dígitos) -> ex: 5584994229126
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (local.charAt(0) === "9") {
      return `55${ddd}${local.slice(1)}`;
    }
    return `55${ddd}${local.slice(-8)}`;
  }

  // Se for apenas número local de 8 ou 9 dígitos sem DDD
  if (digits.length === 9 && digits.charAt(0) === "9") {
    return `55${digits.slice(1)}`;
  }

  return digits.startsWith("55") ? digits : `55${digits}`;
}

/**
 * Formata um número de telefone para EXIBIÇÃO elegante na interface RMCare
 * Mostra o número com o 9º dígito: (DD) 9XXXX-XXXX
 * Exemplo: 558494229126 -> (84) 99422-9126
 * Exemplo: 8494229126 -> (84) 99422-9126
 * Exemplo: 84994229126 -> (84) 99422-9126
 */
export function formatarTelefoneExibicao(telefone) {
  if (!telefone) return "";
  let digits = String(telefone).replace(/\D/g, "");
  if (!digits) return "";

  // Remove DDI 55 se presente
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13 || digits.length >= 10)) {
    digits = digits.slice(2);
  }

  // Se tem 10 dígitos (DDD + 8 dígitos): adiciona o 9 para visualização completa
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const num = digits.slice(2);
    return `(${ddd}) 9${num.slice(0, 4)}-${num.slice(4)}`;
  }

  // Se tem 11 dígitos (DDD + 9 + 8 dígitos): formata padrão celular
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const num = digits.slice(2);
    return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  }

  // Se tem 8 dígitos (sem DDD)
  if (digits.length === 8) {
    return `9${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  // Se tem 9 dígitos (sem DDD)
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  // Fallback se não bater nos comprimentos padrão
  return telefone;
}
