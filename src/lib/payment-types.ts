export interface ApprovedBank {
  id: string;
  bank_name: string;
  country_code: string;
}

export interface BankCred {
  bank_id: string;
  teacher_id: string;
  approved_bank_id: string;
  account_holder_name: string;
  account_number_or_iban: string;
  is_preferred: boolean;
}

export interface BankCredWithBank extends BankCred {
  approved_bank: ApprovedBank;
}
