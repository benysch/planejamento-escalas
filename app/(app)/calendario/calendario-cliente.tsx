"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CalendarioMensal } from "@/components/calendario-mensal";
import { EventoModal } from "@/components/evento-modal";
import type { EventoComPessoas, Pessoa } from "@/lib/types";

type Props = {
  eventos: EventoComPessoas[];
  pessoas: Pessoa[];
  ano: number;
  mes: number;
};

export function CalendarioCliente({ eventos, pessoas, ano, mes }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [eventoSel, setEventoSel] = useState<EventoComPessoas | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  function handleMesChange(novoAno: number, novoMes: number) {
    router.push(`/calendario?ano=${novoAno}&mes=${novoMes}`);
  }

  function handleDiaClick(date: string) {
    setEventoSel(null);
    setDefaultDate(date);
    setModalOpen(true);
  }

  function handleEventoClick(ev: EventoComPessoas) {
    setEventoSel(ev);
    setDefaultDate(undefined);
    setModalOpen(true);
  }

  return (
    <>
      <CalendarioMensal
        eventos={eventos}
        ano={ano}
        mes={mes}
        onMesChange={handleMesChange}
        onDiaClick={handleDiaClick}
        onEventoClick={handleEventoClick}
      />
      <EventoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        evento={eventoSel}
        defaultDate={defaultDate}
        pessoas={pessoas}
      />
    </>
  );
}
