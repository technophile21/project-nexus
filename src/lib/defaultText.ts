export const DEFAULT_TEXT = `title Product Launch — 2026
dateFormat DD-MM-YYYY
defaultAvailability 80%
workingPeriod :05-01-2026, 27-03-2026
holidays :26-01-2026, 20-03-2026

quarter Q1 :01-01-2026, 31-03-2026
quarter Q2 :01-04-2026, 30-06-2026

milestone Design Sign-off :M1, 30-01-2026
milestone Beta Release :M2, 15-04-2026
milestone GA Release :01-06-2026

section Core Backend
Environment Setup :T0, 05-01-2026, 3d
Auth Service :T1, 10d
User API :T2, after T1, 8d
Payment Gateway :T3, after T1, 12d
Data Pipeline :T4, after T2 T3, 10d

section Frontend [100%]
Design System :T5, 05-01-2026, 8d
Dashboard [50%] :T6, after T5, 10d
Checkout Flow :T7, after T5 T3, 8d
Analytics View :T8, after T6 T7, 6d

section QA & Release [60%]
Integration Tests :T9, after T4 T8, 10d
Performance Audit [50%] :T10, after T4, 01-04-2026, 8d
Release Prep :T11, after T9 T10, 5d

section On Hold [0%]
Legacy Migration :T12, 05-01-2026, 20d`;
