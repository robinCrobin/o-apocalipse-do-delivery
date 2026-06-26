import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '15s', target: 100 }, // Ramp-up: sobe rápido para 100 usuários simultâneos
        { duration: '30s', target: 100 }, // Steady: mantém  100 usuários
        { duration: '15s', target: 0 },   // Ramp-down: reduz e fecha as conexões
    ],
    thresholds: {
        http_req_duration: ['p(95)<2500'],
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {
    const url = 'http://localhost:8000/api/v1/checkout';
    const payload = JSON.stringify({
        clienteEmail: 'cliente@entregasja.com',
        valor: 150.00,
        cartao: { numero: '4111111111111111' }
    });

    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(url, payload, params);

    check(res, {
        'resposta tratada pela aplicacao (200, 400 ou 500)': (r) => [200, 400, 500].includes(r.status),
    });

    sleep(0.05);
}