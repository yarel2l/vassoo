import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedJurisdictions() {
    console.log('Fetching States...')
    const { data: states, error: stateError } = await supabase
        .from('us_states')
        .select('id, name, usps_code')
        .in('usps_code', ['NY', 'CA', 'FL'])

    if (stateError || !states) {
        console.error('Error fetching states:', stateError)
        return
    }

    const ny = states.find(s => s.usps_code === 'NY')
    const ca = states.find(s => s.usps_code === 'CA')
    const fl = states.find(s => s.usps_code === 'FL')

    const counties = []

    if (ny) {
        counties.push(
            { state_id: ny.id, fips_code: '36061', name: 'New York (Manhattan)' },
            { state_id: ny.id, fips_code: '36047', name: 'Kings (Brooklyn)' },
            { state_id: ny.id, fips_code: '36081', name: 'Queens' }
        )
    }

    if (ca) {
        counties.push(
            { state_id: ca.id, fips_code: '06037', name: 'Los Angeles' },
            { state_id: ca.id, fips_code: '06075', name: 'San Francisco' }
        )
    }

    if (fl) {
        counties.push(
            { state_id: fl.id, fips_code: '12086', name: 'Miami-Dade' },
            { state_id: fl.id, fips_code: '12011', name: 'Broward' }
        )
    }

    console.log(`Seeding ${counties.length} counties...`)
    const { data: seededCounties, error: countyError } = await supabase
        .from('us_counties')
        .upsert(counties, { onConflict: 'fips_code' })
        .select()

    if (countyError) {
        console.error('Error seeding counties:', countyError)
    } else {
        console.log('Counties seeded successfully.')

        // Seed some cities for the first county of each
        const cities = []
        const nyCounty = seededCounties?.find(c => c.name.includes('Manhattan'))
        const caCounty = seededCounties?.find(c => c.name === 'Los Angeles')
        const flCounty = seededCounties?.find(c => c.name === 'Miami-Dade')

        if (nyCounty) {
            cities.push({ county_id: nyCounty.id, state_id: nyCounty.state_id, name: 'New York City', population: 8400000 })
        }
        if (caCounty) {
            cities.push({ county_id: caCounty.id, state_id: caCounty.state_id, name: 'Los Angeles', population: 3900000 })
        }
        if (flCounty) {
            cities.push({ county_id: flCounty.id, state_id: flCounty.state_id, name: 'Miami', population: 450000 })
        }

        console.log(`Seeding ${cities.length} cities...`)
        const { error: cityError } = await supabase
            .from('us_cities')
            .upsert(cities, { onConflict: 'state_id,name' })

        if (cityError) console.error('Error seeding cities:', cityError)
        else console.log('Cities seeded successfully.')
    }
}

seedJurisdictions()
