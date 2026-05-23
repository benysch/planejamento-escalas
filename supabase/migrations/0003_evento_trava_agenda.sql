-- Migration 0003: flag para travar a agenda de um dia inteiro
alter table pe_eventos add column trava_agenda boolean not null default false;
