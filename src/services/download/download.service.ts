// 文件下载 service
import axios from 'axios';
import {ElMessage} from "element-plus";
// 错误提示
export function errorMsg(msgInfo:any) {
    ElMessage({
        type: 'error',
        showClose: true,
        dangerouslyUseHTMLString: true,
        message: msgInfo,
    });
}

export const downloadClient = axios.create({
    timeout: 10000, // request timeout
});

const downloadClientErrorResponseHandler = (error: any) => {
    if (error.message === 'Network Error' || (error.message && error.message.includes('timeout'))) {
        Promise.reject(new Error('文件下载失败'));
        errorMsg('文件下载失败');
    }
};

// request interceptor
downloadClient.interceptors.request.use(
    config => config,
    error =>
        // do something with request error
        Promise.reject(error),
);

downloadClient.interceptors.response.use(
    response => response.data,
    error => {
        downloadClientErrorResponseHandler(error);
        return Promise.reject(error.response.message);
    },
);

export const download = async (url: string): Promise<File> => await downloadClient({
    url,
    method: 'get',
    responseType: 'blob',
}) as unknown as Promise<File>;
