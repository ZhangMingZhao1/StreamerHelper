export interface biliAPIResponse<T extends dataType | any> {
    code: number,
    message: string,
    data: T
}

type dataType = getQRCodeDataType | loginByQRCodeDataType

export type getQRCodeDataType = {
    url: string,
    auth_code: string
}

export type loginByQRCodeDataType = {
    is_new: boolean,
    mid: number,
    access_token: string,
    refresh_token: string,
    expires_in: number
}

export type getUserInfoDataType = {
    name: string
    mid: number
}