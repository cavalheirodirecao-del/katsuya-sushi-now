export interface CustomerAddress {
  id: string;
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  reference: string;
}

export interface Customer {
  phone: string;
  name: string;
  addresses: CustomerAddress[];
}
