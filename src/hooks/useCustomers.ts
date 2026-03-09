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

export const useCustomers = () => {
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  const lookupByPhone = useCallback(async (phone: string): Promise<Customer | null> => {
    const normalized = phone.replace(/\D/g, "");
    if (normalized.length < 10) return null;

    const { data: customerData, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", normalized)
      .maybeSingle();

    if (error) {
      console.error("Error looking up customer:", error);
      return null;
    }

    if (!customerData) {
      setCurrentCustomer(null);
      return null;
    }

    // Fetch addresses
    const { data: addressesData } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerData.id)
      .order("created_at", { ascending: false });

    const customer: Customer = {
      id: customerData.id,
      phone: customerData.phone,
      name: customerData.name,
      addresses: (addressesData || []).map((a) => ({
        id: a.id,
        label: a.label || "",
        street: a.street,
        number: a.number,
        neighborhood: a.neighborhood,
        reference: a.reference || "",
      })),
    };

    setCurrentCustomer(customer);
    return customer;
  }, []);

  const createOrUpdate = useCallback(async (phone: string, name: string): Promise<Customer | null> => {
    const normalized = phone.replace(/\D/g, "");

    // Upsert customer
    const { data, error } = await supabase
      .from("customers")
      .upsert(
        { phone: normalized, name },
        { onConflict: "phone" }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error upserting customer:", error);
      return null;
    }

    if (!data) return null;

    // Fetch addresses
    const { data: addressesData } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", data.id)
      .order("created_at", { ascending: false });

    const customer: Customer = {
      id: data.id,
      phone: data.phone,
      name: data.name,
      addresses: (addressesData || []).map((a) => ({
        id: a.id,
        label: a.label || "",
        street: a.street,
        number: a.number,
        neighborhood: a.neighborhood,
        reference: a.reference || "",
      })),
    };

    setCurrentCustomer(customer);
    return customer;
  }, []);

  const addAddress = useCallback(async (phone: string, address: Omit<CustomerAddress, "id">): Promise<boolean> => {
    const normalized = phone.replace(/\D/g, "");

    // Get customer ID
    const { data: customerData } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalized)
      .maybeSingle();

    if (!customerData) {
      console.error("Customer not found for phone:", normalized);
      return false;
    }

    const { error } = await supabase
      .from("customer_addresses")
      .insert({
        customer_id: customerData.id,
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

  return { currentCustomer, setCurrentCustomer, lookupByPhone, createOrUpdate, addAddress };
};
