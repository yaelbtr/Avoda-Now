#!/usr/bin/env python3
import sys

content = open('client/src/pages/HomeWorker.tsx').read()

# 1. Add import for isMinor from ageUtils after sonner import
old_import = 'import { toast } from "sonner";'
new_import = 'import { toast } from "sonner";\nimport { isMinor } from "@shared/ageUtils";'
if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print('Import added')
else:
    print('Import NOT FOUND - skipping')

# 2. Add birthDateInfo query after workerStatusQuery
old_query = '  const workerStatusQuery = trpc.workers.myStatus.useQuery(undefined, { enabled: isAuthenticated });'
new_query = (
    '  const workerStatusQuery = trpc.workers.myStatus.useQuery(undefined, { enabled: isAuthenticated });\n'
    '  // Age-gate: fetch birth date info to warn minors about late availability\n'
    '  const birthDateInfoQuery = trpc.user.getBirthDateInfo.useQuery(undefined, {\n'
    '    enabled: isAuthenticated,\n'
    '    staleTime: 5 * 60 * 1000,\n'
    '  });\n'
    '  const workerIsMinor = birthDateInfoQuery.data?.isMinor === true;'
)
if old_query in content:
    content = content.replace(old_query, new_query, 1)
    print('Query added')
else:
    print('Query NOT FOUND')

open('client/src/pages/HomeWorker.tsx', 'w').write(content)
print('Done')
