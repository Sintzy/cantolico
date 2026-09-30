-- Show the infrastructure and pricing announcement once the release reaches
-- the database. The fixed ID makes the migration safe to run more than once.
insert into public."Banner" (
  "id",
  "title",
  "message",
  "type",
  "position",
  "pages",
  "isActive",
  "priority",
  "startDate",
  "endDate",
  "createdById"
)
select
  'c3491a80-07ee-4a35-8a17-7ce10ac75411',
  'Nova infraestrutura, novo preço Premium',
  'Mudámos a infraestrutura do Cantólico. Como o projeto é sem fins lucrativos, seria incoerente manter o preço anterior. O Premium passou a ser uma compra única de 15 €, sem renovação automática — para que fique mais acessível a todos. [Saber mais](/pricing)',
  'ANNOUNCEMENT',
  'POPUP',
  array['ALL'::"BannerPage"],
  true,
  100,
  now(),
  null,
  (select "id" from public."User" where "role" = 'ADMIN' order by "id" asc limit 1)
where exists (select 1 from public."User" where "role" = 'ADMIN')
  and not exists (
    select 1
    from public."Banner"
    where "id" = 'c3491a80-07ee-4a35-8a17-7ce10ac75411'
  );
