import * as fs from 'fs'

const filePath = '/Users/yarel/Documents/DEVELOP/multivendor-store/frontend/contexts/orders-context.tsx'
let content = fs.readFileSync(filePath, 'utf8')

// Remove tax_amount and total from order_items select
content = content.replace(/tax_amount,\s+total,\s+inventory:store_inventories/g, 'inventory:store_inventories')

fs.writeFileSync(filePath, content)
console.log('Fixed orders-context.tsx')
