export interface IApiMeta {
  timestamp: string;
  requestId: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IApiErrorDetails {
  field?: string;
  message: string;
  code?: string;
}

export interface IApiError {
  code: string;
  message: string;
  details?: IApiErrorDetails[];
}

export interface IApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: IApiError | null;
  meta: IApiMeta;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
