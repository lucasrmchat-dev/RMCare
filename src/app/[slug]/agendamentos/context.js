"use client";

import { createContext, useContext } from "react";

export const AgendamentoContext = createContext({});
export const useAgendamento = () => useContext(AgendamentoContext);