import axios from 'axios';
import { useMutation } from '@tanstack/react-query';

const customedAxios = axios.create();

const useGetRequest = () => {
  return useMutation({
    mutationFn: async ({ url, params }) => {
      const response = await customedAxios.get(url, { params });
      return response.data;
    },

    onSuccess: data => {
      console.log('요청 성공: ' + data);
    },

    onError: error => {
      console.log('요청 실패: ' + error);
      alert(
        '데이터를 가져오는데 실패하였습니다. 관리자에게 문의하시길 바랍니다.'
      );
    },
  });
};

export default useGetRequest;
