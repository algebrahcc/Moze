export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'cash' | 'credit' | 'stock'
          account_group: 'daily' | 'investment' | 'fixed' | 'liability'
          credit_limit: number | null
          statement_date: number | null
          payment_due_date: number | null
          currency: string
          is_archived: boolean
          asset_class: 'equities' | 'fixed_income' | 'cash' | 'real_estate' | 'alternatives' | 'crypto' | 'other' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          type: 'cash' | 'credit' | 'stock'
          account_group?: 'daily' | 'investment' | 'fixed' | 'liability'
          credit_limit?: number | null
          statement_date?: number | null
          payment_due_date?: number | null
          currency?: string
          is_archived?: boolean
          asset_class?: 'equities' | 'fixed_income' | 'cash' | 'real_estate' | 'alternatives' | 'crypto' | 'other' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'cash' | 'credit' | 'stock'
          account_group?: 'daily' | 'investment' | 'fixed' | 'liability'
          credit_limit?: number | null
          statement_date?: number | null
          payment_due_date?: number | null
          currency?: string
          is_archived?: boolean
          asset_class?: 'equities' | 'fixed_income' | 'cash' | 'real_estate' | 'alternatives' | 'crypto' | 'other' | null
          created_at?: string
          updated_at?: string
        }
      }
      asset_snapshots: {
        Row: {
          id: string
          user_id: string
          account_id: string
          date: string
          total_value: number
          net_deposit: number
          daily_pnl: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id: string
          date: string
          total_value: number
          net_deposit?: number
          daily_pnl?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          date?: string
          total_value?: number
          net_deposit?: number
          daily_pnl?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      fire_settings: {
        Row: {
            user_id: string
            fire_number: number | null
            withdrawal_rate: number | null
            expected_return: number | null
            current_age: number | null
            retire_age: number | null
            created_at: string
            updated_at: string
        }
        Insert: {
            user_id?: string
            fire_number?: number | null
            withdrawal_rate?: number | null
            expected_return?: number | null
            current_age?: number | null
            retire_age?: number | null
            created_at?: string
            updated_at?: string
        }
        Update: {
            user_id?: string
            fire_number?: number | null
            withdrawal_rate?: number | null
            expected_return?: number | null
            current_age?: number | null
            retire_age?: number | null
            created_at?: string
            updated_at?: string
        }
      }
    }
  }
}
