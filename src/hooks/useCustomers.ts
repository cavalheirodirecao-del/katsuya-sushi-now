import { useState, useCallback } from "react";
import { Customer, CustomerAddress } from "@/data/customer";

const STORAGE_KEY = "katsuya-customers";

const loadCustomers = (): Customer[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

const saveCustomers = (customers: Customer[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
};

export const useCustomers = () => {
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  const lookupByPhone = useCallback((phone: string): Customer | null => {
    const normalized = phone.replace(/\D/g, "");
    if (normalized.length < 10) return null;
    const customers = loadCustomers();
    const found = customers.find((c) => c.phone === normalized) || null;
    setCurrentCustomer(found);
    return found;
  }, []);

  const createOrUpdate = useCallback((phone: string, name: string): Customer => {
    const normalized = phone.replace(/\D/g, "");
    const customers = loadCustomers();
    const idx = customers.findIndex((c) => c.phone === normalized);
    if (idx >= 0) {
      customers[idx].name = name;
      saveCustomers(customers);
      setCurrentCustomer(customers[idx]);
      return customers[idx];
    }
    const newCustomer: Customer = { phone: normalized, name, addresses: [] };
    customers.push(newCustomer);
    saveCustomers(customers);
    setCurrentCustomer(newCustomer);
    return newCustomer;
  }, []);

  const addAddress = useCallback((phone: string, address: CustomerAddress): void => {
    const normalized = phone.replace(/\D/g, "");
    const customers = loadCustomers();
    const idx = customers.findIndex((c) => c.phone === normalized);
    if (idx >= 0) {
      customers[idx].addresses.push(address);
      saveCustomers(customers);
      setCurrentCustomer({ ...customers[idx] });
    }
  }, []);

  return { currentCustomer, setCurrentCustomer, lookupByPhone, createOrUpdate, addAddress };
};
