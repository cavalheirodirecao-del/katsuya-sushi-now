import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerAddress {
  id: string;
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  reference: string;
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  addresses: CustomerAddress[];
}

const parseCustomer = (data: any): Customer => ({
  id: data.id,
  phone: data.phone,
  name: data.name,
  addresses: (data.addresses || []).map((a: any) => ({
    id: a.id,
    label: a.label || "",
    street: a.street,
    number: a.number,
    neighborhood: a.neighborhood,
    reference: a.reference || "",
  })),
});

export const useCustomers = () => {
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  // Uses secure RPC — only returns the customer matching the provided phone.
  // Anonymous users cannot list all customers.
  const lookupByPhone = useCallback(async (phone: string): Promise<Customer | null> => {
    const normalized = phone.replace(/\D/g, "");
    if (normalized.length < 10) return null;

    const { data, error } = await (supabase as any).rpc("lookup_customer_by_phone", {
      p_phone: normalized,
    });

    if (error) {
      console.error("Error looking up customer:", error);
      return null;
    }

    if (!data) {
      setCurrentCustomer(null);
      return null;
    }

    const customer = parseCustomer(data);
    setCurrentCustomer(customer);
    return customer;
  }, []);

  // Uses secure RPC — upserts customer and returns full record with addresses.
  const createOrUpdate = useCallback(async (phone: string, name: string): Promise<Customer | null> => {
    const normalized = phone.replace(/\D/g, "");

    const { data, error } = await (supabase as any).rpc("upsert_customer", {
      p_phone: normalized,
      p_name: name,
    });

    if (error) {
      console.error("Error upserting customer:", error);
      return null;
    }

    if (!data) return null;

    const customer = parseCustomer(data);
    setCurrentCustomer(customer);
    return customer;
  }, []);

  const addAddress = useCallback(async (phone: string, address: Omit<CustomerAddress, "id">): Promise<boolean> => {
    const normalized = phone.replace(/\D/g, "");

    // Get customer via secure RPC (no direct SELECT on customers table)
    const customer = await lookupByPhone(normalized);
    if (!customer) {
      console.error("Customer not found for phone:", normalized);
      return false;
    }

    const { error } = await supabase
      .from("customer_addresses")
      .insert({
        customer_id: customer.id,
        label: address.label,
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        reference: address.reference || "",
      });

    if (error) {
      console.error("Error adding address:", error);
      return false;
    }

    // Refresh customer data
    await lookupByPhone(normalized);
    return true;
  }, [lookupByPhone]);

  const deleteAddress = useCallback(async (addressId: string, phone?: string): Promise<boolean> => {
    const { error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", addressId);

    if (error) {
      console.error("Error deleting address:", error);
      return false;
    }

    if (phone) {
      await lookupByPhone(phone);
    }
    return true;
  }, [lookupByPhone]);

  return { currentCustomer, setCurrentCustomer, lookupByPhone, createOrUpdate, addAddress, deleteAddress };
};
