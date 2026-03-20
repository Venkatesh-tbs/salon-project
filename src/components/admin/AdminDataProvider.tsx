'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appointment, Client, subscribeToAppointments, subscribeToClients } from '@/firebase/db';
import { db } from '@/firebase';

interface AdminDataContextType {
  appointments: Appointment[];
  clients: Client[];
  loadingAppointments: boolean;
  loadingClients: boolean;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    const unsubscribeAppointments = subscribeToAppointments(db, (data) => {
      setAppointments(data);
      setLoadingAppointments(false);
    });

    const unsubscribeClients = subscribeToClients(db, (data) => {
      setClients(data);
      setLoadingClients(false);
    });

    return () => {
      unsubscribeAppointments();
      unsubscribeClients();
    };
  }, []);

  return (
    <AdminDataContext.Provider
      value={{
        appointments,
        clients,
        loadingAppointments,
        loadingClients,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (context === undefined) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
}
