#!/usr/bin/env bash
# Final verification: hydration fix + live URL feature + route transitions
set -u
cd /home/z/my-project

setsid bun run dev > dev.log 2>&1 &
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "server ready: $code"

agent-browser open "http://localhost:3000/" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1

# 1. hydration: server ids vs client ids must match exactly
SERVER=$(curl -s http://localhost:3000/ | grep -o 'id="radix-[^"]*"' | head -1)
CLIENT=$(agent-browser eval "document.querySelectorAll('[data-slot=accordion-trigger]')[0].id" 2>/dev/null)
[ "$SERVER" = "id=\"$CLIENT" ] && echo "IDS MATCH: $SERVER" || echo "IDS Differ: server=$SERVER client=$CLIENT"

# 2. FAQ accordion opens
agent-browser eval "document.querySelectorAll('[data-slot=accordion-trigger]')[0].click(); 'ok'" > /dev/null 2>&1
OPEN=$(agent-browser eval "document.querySelectorAll('[data-slot=accordion-content]')[0].offsetHeight > 0" 2>/dev/null)
echo "accordion opens: $OPEN"
agent-browser eval "document.querySelectorAll('[data-slot=accordion-trigger]')[0].click(); 'ok'" > /dev/null 2>&1

# 3. route transition: click Work link in nav (tests AnimatePresence still animates + no errors)
agent-browser find text "Work" click > /dev/null 2>&1
agent-browser wait 1200 > /dev/null 2>&1
URL=$(agent-browser get url 2>/dev/null)
echo "after nav: $URL"
LINK=$(agent-browser eval "JSON.stringify(Array.from(document.querySelectorAll('a')).filter(a=>a.textContent.includes('View live website')).map(a=>a.getAttribute('href')))" 2>/dev/null)
echo "live links on /work: $LINK"

# 4. console errors?
echo "error/mismatch count: $(agent-browser console 2>&1 | grep -icE 'error|mismatch|hydrat' || true)"
agent-browser errors 2>&1 | head -3

# 5. home back via logo, admin sanity
agent-browser open "http://localhost:3000/#/admin" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1
echo "admin heading: $(agent-browser eval "document.querySelector('h1')?.textContent ?? 'none'" 2>/dev/null)"

pkill -f "next dev" 2>/dev/null; pkill -f next-server 2>/dev/null
echo "=== done ==="
exit 0
