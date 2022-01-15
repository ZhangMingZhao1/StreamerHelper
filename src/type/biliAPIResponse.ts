export interface BiliAPIResponse<T extends DataType | any> {
    code: number,
    message: string,
    data: T
}

type DataType = GetQRCodeResponse | LoginResponse

export type GetQRCodeResponse = {
    url: string,
    auth_code: string
}

export type LoginResponse = {
    is_new: boolean,
    token_info: TokenInfo
}

export type GetUserInfoResponse = {
    name: string
    mid: number
}

export type TokenInfo = {
    mid: number,
    access_token: string,
    refresh_token: string,
    expires_in: number
}