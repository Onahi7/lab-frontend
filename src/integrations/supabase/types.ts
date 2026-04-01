// Dummy types for compatibility - Supabase has been replaced with NestJS backend
export type Database = {
  public: {
    Tables: {
      machines: {
        Row: any;
      };
    };
    Enums: {
      result_flag: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';
      app_role: 'admin' | 'receptionist' | 'lab_tech';
      test_category: 'hematology' | 'chemistry' | 'immunoassay' | 'serology' | 'urinalysis' | 'microbiology' | 'other';
    };
  };
};
