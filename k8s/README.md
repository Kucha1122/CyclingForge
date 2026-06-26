# CyclingForge — Kubernetes deployment

Manifesty deployowane automatycznie przez `.github/workflows/deploy.yml` przy push do `main`.

## Jednorazowa konfiguracja klastra (przed pierwszym deployem)

Wykonaj raz na `k3s-server`:

### 1. Namespace
```bash
sudo kubectl apply -f k8s/namespace.yaml
```

### 2. imagePullSecret (pobieranie prywatnych obrazów z ghcr.io)
Utwórz GitHub PAT (classic) z uprawnieniem `read:packages`:
https://github.com/settings/tokens

```bash
sudo kubectl -n cyclingforge create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=Kucha1122 \
  --docker-password=<PAT_READ_PACKAGES>
```

### 3. Sekrety aplikacji
```bash
cp k8s/secrets.example.yaml k8s/secrets.yaml
# uzupełnij prawdziwe wartości (hasła DB, JWT, Strava)
sudo kubectl apply -f k8s/secrets.yaml
```

### 4. Publiczny dostęp — Tailscale Funnel
HTTPS i ekspozycja do internetu są realizowane przez Tailscale Funnel na k3s-server
(kieruje ruch na Traefik :80). Nie używamy cert-managera ani port forwardingu.
Publiczny adres: `https://<node>.<tailnet>.ts.net`.

## Po deployu — weryfikacja
```bash
sudo kubectl -n cyclingforge get pods
sudo kubectl -n cyclingforge get ingress
sudo tailscale funnel status
```
