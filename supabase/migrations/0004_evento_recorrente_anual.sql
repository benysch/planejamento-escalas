-- Migration 0004: flag para eventos que se repetem todo ano (ex: aniversários)
alter table pe_eventos add column recorrente_anual boolean not null default false;
