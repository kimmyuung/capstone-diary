import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

const Monitoring: React.FC = () => {
    // Grafana URL (로컬환경 또는 환경변수)
    // iframe 보안 정책(X-Frame-Options) 해제가 필요할 수 있음 (Grafana 설정)
    // docker-compose의 GF_SECURITY_ALLOW_EMBEDDING=true 설정이 필요함!
    const GRAFANA_URL = "http://localhost:3000/d/1860/django-prometheus?orgId=1&refresh=5s&kiosk";

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                시스템 모니터링
            </Typography>

            <Paper
                sx={{
                    height: '80vh',
                    overflow: 'hidden',
                    borderRadius: 2,
                    boxShadow: 3
                }}
            >
                <iframe
                    src={GRAFANA_URL}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    title="Grafana Dashboard"
                />
            </Paper>
        </Box>
    );
};

export default Monitoring;
