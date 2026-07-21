"use client";

import ModuleBoasVindas from "./ModuleBoasVindas";
import ModuleIdentificacao from "./ModuleIdentificacao";
import ModuleEspecialidade from "./ModuleEspecialidade";
import ModuleTriagem from "./ModuleTriagem";
import ModuleModalidade from "./ModuleModalidade";
import ModuleAgenda from "./ModuleAgenda";
import ModuleCheckout from "./ModuleCheckout";
import ModuleConcluido from "./ModuleConcluido";

export const MODULE_REGISTRY = {
  "boas_vindas": ModuleBoasVindas,
  "identificacao": ModuleIdentificacao,
  "especialidade": ModuleEspecialidade,
  "triagem": ModuleTriagem,
  "modalidade": ModuleModalidade,
  "agenda": ModuleAgenda,
  "checkout": ModuleCheckout,
  "concluido": ModuleConcluido
};