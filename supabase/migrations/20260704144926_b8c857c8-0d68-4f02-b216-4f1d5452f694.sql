
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'discussion';

-- Replace public view policy so hidden posts are only visible to their author or admins
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "View non-hidden posts"
ON public.posts
FOR SELECT
USING (
  is_hidden = false
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update (hide/unhide) any post
DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Admins can update any post"
ON public.posts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any post
DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post"
ON public.posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
