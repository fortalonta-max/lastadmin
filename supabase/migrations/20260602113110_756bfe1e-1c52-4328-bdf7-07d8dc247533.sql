
create policy "Public read product images" on storage.objects for select to anon, authenticated
using (bucket_id = 'products');

create policy "Admins upload product images" on storage.objects for insert to authenticated
with check (bucket_id = 'products' and public.has_role(auth.uid(),'admin'));

create policy "Admins update product images" on storage.objects for update to authenticated
using (bucket_id = 'products' and public.has_role(auth.uid(),'admin'));

create policy "Admins delete product images" on storage.objects for delete to authenticated
using (bucket_id = 'products' and public.has_role(auth.uid(),'admin'));
