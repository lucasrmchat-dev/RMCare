// Proxy de IP fixo homologado pelo MedicalSYS. Único ponto do código que define o endereço.
// ⚠️ Mova esta URL para a variável de ambiente FIXIE_URL e remova o valor padrão abaixo:
// credenciais não devem ficar no repositório (ver ARQUITETURA_E_SEGURANCA.md, item 2).
export const MEDICALSYS_PROXY_URL =
  process.env.FIXIE_URL || "http://fixie:1c54Fc5I1jgmHG2@criterium.usefixie.com:80";
