// Read-only: prints row counts, counters and highest codes in APP_DATABASE_URL. Writes nothing.
import { neon } from '@neondatabase/serverless'

async function main() {
  const sql = neon(process.env.APP_DATABASE_URL!)
  const tables = ['characters','locations','items','cultures','factions','races','languages','lore','events','stories','writing','relationships','tags','media']
  for (const t of tables) {
    try {
      const r = await sql.query(`select count(*)::int as c from ${t}`)
      let extra = ''
      if (t !== 'tags' && t !== 'media') {
        const m = await sql.query(`select code from ${t} order by id desc limit 3`)
        extra = '  last codes: ' + m.map((x: any) => x.code).join(', ')
      }
      console.log(t.padEnd(14), String(r[0].c).padStart(4), extra)
    } catch (e: any) {
      console.log(t.padEnd(14), 'ERROR', e.message)
    }
  }
  console.log('counters:', JSON.stringify(await sql.query('select * from counters order by 1')))
}
main().catch((e) => { console.error(e.message); process.exit(1) })
