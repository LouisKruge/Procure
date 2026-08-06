-- NEXUS Stock :: 06 seed data
--
-- Enough of a working dataset to exercise every flow on day one:
-- 5 sites, a hierarchical category tree, 6 suppliers, ~36 stock items with
-- barcodes and bin locations, per-site levels deliberately spread across
-- ok / low / out, 90 days of movement history (including some deliberately
-- stale lines so the dead-stock report has something to find), open POs in
-- several states, a transfer sitting in transit, and a stock take waiting
-- on supervisor approval.

-- ---------------------------------------------------------------- sites
insert into public.sites (code, name, address) values
  ('MAIN', 'Main Warehouse',       '14 Chrome Street, Alrode, Alberton'),
  ('JHB',  'Johannesburg Branch',  '88 Anderson Street, City Deep, Johannesburg'),
  ('DBN',  'Durban Branch',        '5 Sea Cow Lake Road, Springfield, Durban'),
  ('CPT',  'Cape Town Branch',     '21 Marconi Road, Montague Gardens, Cape Town'),
  ('WKS',  'Workshop Store',       '14 Chrome Street, Alrode (rear workshop)');

-- ----------------------------------------------------------- categories
insert into public.categories (code, name, sort_order) values
  ('CONS', 'Consumables', 10),
  ('ELEC', 'Electrical',  20),
  ('FITT', 'Fittings',    30),
  ('WKSP', 'Workshop',    40);

insert into public.categories (code, name, parent_id, sort_order)
select v.code, v.name, p.id, v.sort_order
from (values
  ('CONS-ABR', 'Abrasives',      'CONS', 11),
  ('CONS-WLD', 'Welding',        'CONS', 12),
  ('CONS-LUB', 'Lubricants',     'CONS', 13),
  ('ELEC-CBL', 'Cable & Wiring', 'ELEC', 21),
  ('ELEC-SW',  'Switchgear',     'ELEC', 22),
  ('FITT-HYD', 'Hydraulic',      'FITT', 31),
  ('FITT-PNU', 'Pneumatic',      'FITT', 32),
  ('WKSP-TOOL','Hand Tools',     'WKSP', 41),
  ('WKSP-BRG', 'Bearings & Seals','WKSP', 42)
) as v(code, name, parent, sort_order)
join public.categories p on p.code = v.parent;

-- ------------------------------------------------------------ suppliers
insert into public.suppliers (code, name, contact_name, email, phone, lead_time_days) values
  ('HYDSA',   'Hydraulic Supplies SA',  'Pieter van Zyl', 'orders@hydsa.co.za',     '011 908 4412', 5),
  ('ELECMAX', 'ElectroMax Distributors','Naledi Mokoena', 'sales@electromax.co.za', '011 622 7788', 7),
  ('ABRPRO',  'AbrasivePro',            'Riaan Botha',    'orders@abrasivepro.co.za','011 493 2210', 3),
  ('BEARCO',  'BearingCo Industrial',   'Sanjay Naidoo',  'desk@bearingco.co.za',   '031 579 1140', 10),
  ('TOOLZ',   'ToolZone Industrial',    'Karin de Wet',   'sales@toolzone.co.za',   '021 552 3390', 4),
  ('WELDTEC', 'WeldTec Africa',         'Thabo Dlamini',  'orders@weldtec.co.za',   '011 866 5521', 6);

-- ----------------------------------------------------------- stock items
insert into public.stock_items
  (sku, description, category_id, uom, barcode, default_bin,
   reorder_point, reorder_qty, standard_cost, avg_cost, default_supplier_id)
select v.sku, v.descr, c.id, v.uom, v.barcode, v.bin,
       v.rop::numeric, v.roq::numeric, v.cost::numeric, v.cost::numeric, s.id
from (values
  -- Hydraulic fittings
  ('HF-0804-MB', 'Hydraulic Adaptor 1/2" BSP Male x 1/4" BSP Female', 'FITT-HYD', 'EA', '6001234500011', 'A01-01',  40, 100,  48.50, 'HYDSA'),
  ('HF-1206-MM', 'Hydraulic Adaptor 3/4" BSP Male x 3/8" BSP Male',   'FITT-HYD', 'EA', '6001234500028', 'A01-02',  30,  80,  62.75, 'HYDSA'),
  ('HF-0808-SW', 'Hydraulic Swivel Elbow 1/2" BSP 90deg',             'FITT-HYD', 'EA', '6001234500035', 'A01-03',  25,  60, 118.40, 'HYDSA'),
  ('HH-R2-12',   'Hydraulic Hose R2 1/2" (per metre)',                'FITT-HYD', 'M',  '6001234500042', 'A02-01', 120, 300,  86.20, 'HYDSA'),
  ('HH-R2-34',   'Hydraulic Hose R2 3/4" (per metre)',                'FITT-HYD', 'M',  '6001234500059', 'A02-02',  80, 200, 134.90, 'HYDSA'),
  ('HF-QRC-12',  'Quick Release Coupler 1/2" ISO-A Male',             'FITT-HYD', 'EA', '6001234500066', 'A01-05',  20,  50, 245.00, 'HYDSA'),
  ('HF-BAN-10',  'Banjo Bolt M10 x 1.0 Steel',                        'FITT-HYD', 'EA', '6001234500073', 'A01-07',  60, 150,  19.80, 'HYDSA'),
  ('HS-ORING-K', 'O-Ring Kit BSP Bonded Seal Assorted (382pc)',       'FITT-HYD', 'KIT','6001234500080', 'A03-01',   8,  20, 486.00, 'HYDSA'),
  -- Pneumatic
  ('PN-PUSH-08', 'Pneumatic Push-In Fitting 8mm x 1/4" BSP',          'FITT-PNU', 'EA', '6001234500097', 'A04-01',  50, 120,  27.30, 'HYDSA'),
  ('PN-TUBE-08', 'Pneumatic Tubing 8mm PU Blue (per metre)',          'FITT-PNU', 'M',  '6001234500103', 'A04-02', 100, 250,  12.45, 'HYDSA'),
  ('PN-FRL-12',  'FRL Unit 1/2" Filter Regulator Lubricator',         'FITT-PNU', 'EA', '6001234500110', 'A04-05',   4,  10, 1285.00,'HYDSA'),
  ('PN-VALVE-5', 'Solenoid Valve 5/2 24VDC 1/4" BSP',                 'FITT-PNU', 'EA', '6001234500127', 'A04-06',   6,  15, 742.50, 'HYDSA'),
  -- Electrical cable
  ('EC-25-BLK',  'Surfix Cable 2.5mm 3-Core Black (per metre)',       'ELEC-CBL', 'M',  '6001234500134', 'B01-01', 200, 500,  31.60, 'ELECMAX'),
  ('EC-15-WHT',  'Surfix Cable 1.5mm 3-Core White (per metre)',       'ELEC-CBL', 'M',  '6001234500141', 'B01-02', 200, 500,  22.10, 'ELECMAX'),
  ('EC-4C-40',   'Armoured Cable 4mm 4-Core SWA (per metre)',         'ELEC-CBL', 'M',  '6001234500158', 'B01-05',  60, 150, 148.75, 'ELECMAX'),
  ('EL-LUG-16',  'Cable Lug 16mm Copper Compression',                 'ELEC-CBL', 'EA', '6001234500165', 'B02-01', 100, 300,   8.90, 'ELECMAX'),
  ('EL-GLAND-20','Cable Gland 20mm Brass IP68',                       'ELEC-CBL', 'EA', '6001234500172', 'B02-03',  80, 200,  16.40, 'ELECMAX'),
  ('EL-TRUNK-50','Cable Trunking 50x50mm PVC (2m length)',            'ELEC-CBL', 'EA', '6001234500189', 'B03-01',  30,  75,  94.20, 'ELECMAX'),
  -- Switchgear
  ('SW-CB-32',   'Circuit Breaker 32A Single Pole',                   'ELEC-SW',  'EA', '6001234500196', 'B04-01',  25,  60,  87.50, 'ELECMAX'),
  ('SW-CB-63',   'Circuit Breaker 63A Triple Pole',                   'ELEC-SW',  'EA', '6001234500202', 'B04-02',  10,  25, 412.00, 'ELECMAX'),
  ('SW-CONT-25', 'Contactor 25A 3-Pole 230V Coil',                    'ELEC-SW',  'EA', '6001234500219', 'B04-04',  12,  30, 528.90, 'ELECMAX'),
  ('SW-ISO-63',  'Isolator Switch 63A 4-Pole Enclosed',               'ELEC-SW',  'EA', '6001234500226', 'B04-06',   6,  15, 689.00, 'ELECMAX'),
  ('SW-RELAY-8', 'Relay 8-Pin 24VDC with Base',                       'ELEC-SW',  'EA', '6001234500233', 'B05-01',  20,  50, 126.30, 'ELECMAX'),
  -- Abrasives
  ('AB-CUT-115', 'Cutting Disc 115x1.0x22mm Steel',                   'CONS-ABR', 'EA', '6001234500240', 'C01-01', 150, 400,   9.75, 'ABRPRO'),
  ('AB-CUT-230', 'Cutting Disc 230x2.0x22mm Steel',                   'CONS-ABR', 'EA', '6001234500257', 'C01-02',  80, 200,  21.40, 'ABRPRO'),
  ('AB-GRD-115', 'Grinding Disc 115x6.0x22mm Steel',                  'CONS-ABR', 'EA', '6001234500264', 'C01-04', 100, 250,  14.60, 'ABRPRO'),
  ('AB-FLAP-115','Flap Disc 115mm 80 Grit Zirconium',                 'CONS-ABR', 'EA', '6001234500271', 'C01-06',  60, 150,  28.90, 'ABRPRO'),
  ('AB-EMERY-P80','Emery Cloth Roll P80 50mm x 50m',                  'CONS-ABR', 'ROL','6001234500288', 'C02-01',  10,  25, 312.00, 'ABRPRO'),
  -- Welding
  ('WD-E6013-32','Welding Electrode E6013 3.2mm (5kg pack)',          'CONS-WLD', 'PKT','6001234500295', 'C03-01',  20,  50, 268.00, 'WELDTEC'),
  ('WD-MIG-08',  'MIG Wire ER70S-6 0.8mm (15kg reel)',                'CONS-WLD', 'REL','6001234500301', 'C03-03',   8,  20, 742.00, 'WELDTEC'),
  ('WD-TIP-08',  'MIG Contact Tip 0.8mm M6',                          'CONS-WLD', 'EA', '6001234500318', 'C03-05', 100, 250,   6.80, 'WELDTEC'),
  ('WD-SHIELD-9','Welding Helmet Auto-Darkening Shade 9-13',          'CONS-WLD', 'EA', '6001234500325', 'C04-01',   5,  12, 1180.00,'WELDTEC'),
  -- Lubricants
  ('LB-HYD-46',  'Hydraulic Oil ISO 46 (20L)',                        'CONS-LUB', 'EA', '6001234500332', 'C05-01',  12,  30, 685.00, 'TOOLZ'),
  ('LB-GRS-EP2', 'Grease EP2 Lithium Complex (450g cartridge)',       'CONS-LUB', 'EA', '6001234500349', 'C05-03',  40, 100,  62.40, 'TOOLZ'),
  -- Bearings & seals
  ('BR-6205-2RS','Bearing 6205 2RS Deep Groove Ball',                 'WKSP-BRG', 'EA', '6001234500356', 'D01-01',  30,  80,  94.50, 'BEARCO'),
  ('BR-6206-2RS','Bearing 6206 2RS Deep Groove Ball',                 'WKSP-BRG', 'EA', '6001234500363', 'D01-02',  25,  60, 118.20, 'BEARCO'),
  ('BR-UCP-205', 'Pillow Block Bearing UCP205 25mm',                  'WKSP-BRG', 'EA', '6001234500370', 'D01-05',  15,  40, 236.80, 'BEARCO'),
  ('SL-OIL-3552','Oil Seal 35x52x7mm Nitrile',                        'WKSP-BRG', 'EA', '6001234500387', 'D02-01',  40, 100,  34.60, 'BEARCO'),
  -- Hand tools
  ('TL-SPAN-SET','Spanner Set 8-24mm Combination (14pc)',             'WKSP-TOOL','SET','6001234500394', 'D04-01',   4,  10, 892.00, 'TOOLZ'),
  ('TL-GRIND-115','Angle Grinder 115mm 900W 230V',                    'WKSP-TOOL','EA', '6001234500400', 'D04-03',   3,   8, 1450.00,'TOOLZ'),
  ('TL-TAPE-8M', 'Measuring Tape 8m Steel',                           'WKSP-TOOL','EA', '6001234500417', 'D05-01',  15,  40,  86.50, 'TOOLZ'),
  ('TL-GLOVE-L', 'Work Gloves Nitrile Coated Large (pair)',           'WKSP-TOOL','PR', '6001234500424', 'D06-01',  60, 200,  38.20, 'TOOLZ')
) as v(sku, descr, cat, uom, barcode, bin, rop, roq, cost, sup)
join public.categories c on c.code = v.cat
join public.suppliers  s on s.code = v.sup;

-- Supplier part numbers / last-known pricing for procurement.
insert into public.supplier_items
  (supplier_id, item_id, supplier_part_no, last_price, last_price_at, is_preferred, lead_time_days)
select si.default_supplier_id,
       si.id,
       upper(replace(si.sku, '-', '')) || '/' || sup.code,
       round(si.standard_cost * 0.96, 2),
       now() - (abs(hashtext(si.sku)) % 60 || ' days')::interval,
       true,
       sup.lead_time_days
  from public.stock_items si
  join public.suppliers sup on sup.id = si.default_supplier_id;

-- A second (non-preferred) source on a subset, so the procurement screen
-- has a real alternative to show rather than a single hard-wired supplier.
insert into public.supplier_items
  (supplier_id, item_id, supplier_part_no, last_price, last_price_at, is_preferred, lead_time_days)
select alt.id,
       si.id,
       'ALT-' || si.sku,
       round(si.standard_cost * 1.08, 2),
       now() - (abs(hashtext(si.sku || 'alt')) % 90 || ' days')::interval,
       false,
       alt.lead_time_days
  from public.stock_items si
  join public.suppliers alt on alt.code = 'TOOLZ'
 where si.default_supplier_id <> alt.id
   and abs(hashtext(si.sku)) % 3 = 0;

-- --------------------------------------------------------- stock levels
-- Spread deliberately across healthy / low / out so the dashboard has
-- something to say the moment you log in.
insert into public.stock_levels (item_id, site_id, qty_on_hand, bin_location, last_movement_at)
select si.id,
       s.id,
       case
         when h % 19 = 0 then 0                                    -- stocked out
         when h % 11 = 0 then floor(si.reorder_point * 0.4)        -- below reorder point
         when h % 7  = 0 then si.reorder_point                     -- exactly at the line
         else si.reorder_point + (h % 240)
       end,
       case s.code
         when 'MAIN' then si.default_bin
         else substr(si.default_bin, 1, 1) || to_char((h % 9) + 1, 'FM00') || '-' || to_char((h % 6) + 1, 'FM00')
       end,
       now() - ((h % 170) || ' days')::interval - ((h % 23) || ' hours')::interval
  from public.stock_items si
  cross join public.sites s
  cross join lateral (select abs(hashtext(si.sku || s.code)) as h) hh
 where s.code = 'MAIN'                       -- main warehouse carries everything
    or abs(hashtext(si.sku || s.code)) % 4 <> 0;   -- branches carry ~75% of the range

-- ---------------------------------------------------- movement history
-- Roughly three months of plausible traffic, so the item history panel,
-- the movement export and the dead-stock report all have real data.
insert into public.stock_movements
  (item_id, site_id, movement_type, direction, qty, qty_after, unit_cost,
   reason, reference_type, reference_no, created_at)
select sl.item_id,
       sl.site_id,
       case when g % 3 = 0 then 'receipt'::public.movement_type
            else 'dispatch'::public.movement_type end,
       case when g % 3 = 0 then 'in'::public.movement_direction
            else 'out'::public.movement_direction end,
       greatest(1, (abs(hashtext(sl.id::text || g::text)) % 25))::numeric,
       sl.qty_on_hand,
       si.avg_cost,
       case when g % 3 = 0 then 'Stock received'
            when g % 3 = 1 then 'Issued to job'
            else 'Counter sale' end,
       case when g % 3 = 0 then 'purchase_order' else 'dispatch' end,
       case when g % 3 = 0 then 'PO-HIST-' || lpad((abs(hashtext(sl.id::text)) % 900 + 100)::text, 3, '0')
            else 'DN-HIST-' || lpad((abs(hashtext(sl.id::text || g::text)) % 900 + 100)::text, 3, '0') end,
       now() - ((abs(hashtext(sl.id::text || g::text)) % 88) || ' days')::interval
  from public.stock_levels sl
  join public.stock_items si on si.id = sl.item_id
  cross join generate_series(1, 3) g
 where sl.qty_on_hand > 0
   and abs(hashtext(sl.id::text)) % 5 <> 0;   -- leave some lines quiet for dead-stock

-- ------------------------------------------------------ purchase orders
-- One draft, one sent and awaiting delivery, one already part-received.
insert into public.purchase_orders (po_number, supplier_id, site_id, status, order_date, expected_date, notes, sent_at)
select 'PO-000101', s.id, st.id, 'sent', current_date - 6, current_date - 1,
       'Standing replenishment - hydraulics', now() - interval '6 days'
  from public.suppliers s, public.sites st where s.code = 'HYDSA' and st.code = 'MAIN';

insert into public.purchase_orders (po_number, supplier_id, site_id, status, order_date, expected_date, notes, sent_at)
select 'PO-000102', s.id, st.id, 'partially_received', current_date - 12, current_date - 4,
       'Electrical top-up for JHB', now() - interval '12 days'
  from public.suppliers s, public.sites st where s.code = 'ELECMAX' and st.code = 'JHB';

insert into public.purchase_orders (po_number, supplier_id, site_id, status, order_date, expected_date, notes)
select 'PO-000103', s.id, st.id, 'draft', current_date, current_date + 3,
       'Abrasives - not yet sent'
  from public.suppliers s, public.sites st where s.code = 'ABRPRO' and st.code = 'MAIN';

insert into public.purchase_order_lines
  (purchase_order_id, item_id, line_no, qty_ordered, qty_received, unit_price, supplier_part_no)
select po.id,
       si.id,
       row_number() over (partition by po.id order by si.sku),
       si.reorder_qty,
       case when po.po_number = 'PO-000102' and abs(hashtext(si.sku)) % 2 = 0
            then floor(si.reorder_qty / 2) else 0 end,
       round(si.standard_cost * 0.96, 2),
       upper(replace(si.sku, '-', ''))
  from public.purchase_orders po
  join public.stock_items si on si.default_supplier_id = po.supplier_id
 where (po.po_number = 'PO-000101' and si.sku like 'HF-%')
    or (po.po_number = 'PO-000102' and si.sku like 'SW-%')
    or (po.po_number = 'PO-000103' and si.sku like 'AB-%');

-- Reflect the outstanding quantities on the sent/part-received POs.
update public.stock_levels sl
   set qty_on_order = sub.outstanding
  from (
    select pol.item_id, po.site_id, sum(pol.qty_ordered - pol.qty_received) as outstanding
      from public.purchase_order_lines pol
      join public.purchase_orders po on po.id = pol.purchase_order_id
     where po.status in ('sent', 'partially_received')
     group by pol.item_id, po.site_id
  ) sub
 where sl.item_id = sub.item_id and sl.site_id = sub.site_id;

-- ---------------------------------------------------- transfer in transit
-- Deliberately left mid-flight so the in-transit state is visible without
-- having to create one first.
insert into public.transfers (transfer_number, from_site_id, to_site_id, status, notes, sent_at)
select 'TR-000101', f.id, t.id, 'in_transit', 'Branch replenishment from main store', now() - interval '2 days'
  from public.sites f, public.sites t where f.code = 'MAIN' and t.code = 'DBN';

insert into public.transfer_lines (transfer_id, item_id, qty_sent, unit_cost)
select tr.id, si.id, 10, si.avg_cost
  from public.transfers tr
  join public.stock_items si on si.sku in ('BR-6205-2RS', 'BR-6206-2RS', 'SL-OIL-3552')
 where tr.transfer_number = 'TR-000101';

-- Stock has already left MAIN...
update public.stock_levels sl
   set qty_on_hand = greatest(sl.qty_on_hand - tl.qty_sent, 0)
  from public.transfer_lines tl
  join public.transfers tr on tr.id = tl.transfer_id
  join public.sites f on f.id = tr.from_site_id
 where tr.transfer_number = 'TR-000101'
   and sl.item_id = tl.item_id and sl.site_id = f.id;

-- ...and is showing as inbound at DBN until someone books it in.
update public.stock_levels sl
   set qty_in_transit = tl.qty_sent
  from public.transfer_lines tl
  join public.transfers tr on tr.id = tl.transfer_id
  join public.sites t on t.id = tr.to_site_id
 where tr.transfer_number = 'TR-000101'
   and sl.item_id = tl.item_id and sl.site_id = t.id;

insert into public.stock_movements
  (item_id, site_id, movement_type, direction, qty, unit_cost, reason, reference_type, reference_id, reference_no, created_at)
select tl.item_id, tr.from_site_id, 'transfer_out', 'out', tl.qty_sent, tl.unit_cost,
       'Transfer to DBN', 'transfer', tr.id, tr.transfer_number, tr.sent_at
  from public.transfer_lines tl
  join public.transfers tr on tr.id = tl.transfer_id
 where tr.transfer_number = 'TR-000101';

-- ------------------------------------------- stock take awaiting approval
insert into public.stock_takes (reference, site_id, scope, category_id, status, notes, submitted_at)
select 'ST-000101', s.id, 'category', c.id, 'pending_approval',
       'Monthly cycle count - hydraulic fittings', now() - interval '1 day'
  from public.sites s, public.categories c
 where s.code = 'MAIN' and c.code = 'FITT-HYD';

insert into public.stock_take_lines
  (stock_take_id, item_id, bin_location, expected_qty, counted_qty, unit_cost, counted_at)
select st.id,
       sl.item_id,
       sl.bin_location,
       sl.qty_on_hand,
       -- Most lines count clean; a few are deliberately out so the
       -- variance report and the approval gate have something to show.
       case
         when abs(hashtext(si.sku)) % 4 = 0 then greatest(sl.qty_on_hand - (abs(hashtext(si.sku)) % 6) - 1, 0)
         when abs(hashtext(si.sku)) % 7 = 0 then sl.qty_on_hand + (abs(hashtext(si.sku)) % 4) + 1
         else sl.qty_on_hand
       end,
       si.avg_cost,
       now() - interval '1 day'
  from public.stock_takes st
  join public.stock_levels sl on sl.site_id = st.site_id
  join public.stock_items si on si.id = sl.item_id
  join public.categories c on c.id = si.category_id
 where st.reference = 'ST-000101' and c.code = 'FITT-HYD';

-- ----------------------------------------------------------- cost history
-- A few historical price moves so the cost trend panel is not empty.
insert into public.cost_history (item_id, cost_type, old_cost, new_cost, reason, created_at)
select si.id, 'average',
       round(si.avg_cost * 0.88, 2), si.avg_cost,
       'Supplier price increase', now() - interval '45 days'
  from public.stock_items si
 where abs(hashtext(si.sku)) % 3 = 0;

insert into public.cost_history (item_id, cost_type, old_cost, new_cost, reason, created_at)
select si.id, 'standard',
       round(si.standard_cost * 0.94, 2), si.standard_cost,
       'Annual standard cost review', now() - interval '120 days'
  from public.stock_items si;
