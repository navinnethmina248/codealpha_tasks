**Status**: Implemented
**Created**: 2026-11-23
**Mode**: Existing project UI redesign

## 1. Project Overview

Redesign the existing Friendzy interface into a cohesive, modern, responsive social experience while preserving the current Django application, routes, data model, and behavior. The work is a presentation-layer refresh of the current application, not a new product or a backend/API migration.

**Product**: Friendzy
**Primary users**: Authenticated community members who browse a feed, share posts, follow people, and interact with posts; visitors who sign in or register.
**Success criteria**: Existing workflows remain intact and usable at desktop and mobile sizes; templates share a consistent visual language; primary feed, profile, post, and authentication tasks are easy to find and complete.

## 2. Goals & Scope

**Goals**
- Establish a recognizable, polished visual identity across the feed, profiles, post detail, create-post, login, and registration pages.
- Improve information hierarchy, spacing, typography, and interaction affordances without changing application behavior.
- Make navigation, feed cards, profile information, and forms work comfortably on small touch screens as well as desktop.
- Preserve Django template rendering, URL names, form field names, CSRF protection, permission checks, messages, pagination, and existing JavaScript fallbacks.

**In scope**
- Refresh shared page shell, navigation, feed tabs, post cards, people-to-follow panel, profiles, post detail/comments, post creation, and authentication screens.
- Improve semantic markup and accessible states as needed to support the new design.
- Refine existing static CSS and JavaScript only where required for responsive or accessible interactions.

**Out of scope**
- New product features, social graph or feed logic changes, API/backend redesign, database migrations, third-party identity, Azure deployment, or changes to existing post/profile content behavior.

## 3. Current Project & Requirements

**Existing implementation**: Django server-rendered templates with shared `base.html` and reusable navbar, avatar, post-card, and pagination includes; Python views/forms and named routes in `social`; vanilla CSS (`style.css`, `profile.css`, `auth.css`) and JavaScript (`main.js`, `interactions.js`, `posts.js`); SQLite database and locally stored profile/post images.
**Existing page flows**: Authenticated users land on the Following feed and can switch to Everyone with `?tab=all`; the feed paginates 10 posts and includes follow suggestions. Users can create posts with optional images, open post details and comment, like/unlike, follow/unfollow, and view/edit profiles. Login and registration are available to signed-out visitors.
**Current contracts to preserve**: Named routes `feed`, `create_post`, `post_detail`, `like_post`, `delete_post`, `profile`, `follow_toggle`, `register`, `login`, and `logout`; existing template context such as `page`, `tab`, `liked_ids`, `suggestions`, `owner`, `is_own`, `is_following`, `followers_count`, `following_count`, `post`, `comments`, and `form`; and existing form field names, CSRF tokens, redirect behavior, messages, and access controls. Posts support up to 500 content characters and an optional image; comments support up to 300 characters.
**Requirements**: Treat the current application as the source of truth. Keep the current Django context variables and template flow unless a small markup adjustment is needed for presentation. Preserve server-side POST behavior and graceful non-JavaScript operation. Existing likes and follows use AJAX when available and fall back to ordinary form POSTs; the create-post page already provides a character counter and image preview.
**Data stores**: Existing SQLite database and local media directory remain unchanged; no new datastore or cloud service is planned.

## 4. Architecture & Services

**Application shape**: Existing single Django application with server-rendered UI; no separate SPA or API service is introduced.
**Frontend**: Django templates in `templates/`, existing static CSS under `static/css/`, and vanilla JavaScript under `static/js/`.
**Backend**: Existing Django views, forms, models, authentication, and named URL routes in `social/` and `config/`; presentation changes must not alter their contracts.
**Persistence/media**: Retain the current SQLite and local `media/` configuration. Uploaded images continue to use existing model fields and serving behavior.
**Interaction model**: Continue using ordinary Django forms and POST requests. Existing AJAX enhancement for likes/follows remains progressive enhancement with normal form fallback.

## 5. User Experience & Functional Requirements

- **Global shell**: Create a consistent brand/header treatment and clear navigation to Feed, New post, and the signed-in user's profile; expose Login and Register to visitors and retain the POST logout form for signed-in users.
- **Feed**: Give Following and Everyone a clear selected state; prioritize the post stream and retain people-to-follow suggestions on wide screens. Keep empty states, pagination, and the new-post entry point.
- **Post cards**: Improve author identity, timestamp, readable text, image presentation, and action hierarchy. Clearly distinguish liked state and counts; expose comments and owner-only delete without changing their endpoint/form semantics.
- **Profile**: Present avatar, username, bio, post/follower/following counts, follow action, profile edit controls for the owner, and the user's post list as one coherent profile page.
- **Post detail**: Keep the post and comment thread easy to scan, make the comment form prominent, and retain the back-to-feed path.
- **Create post**: Focus attention on the content field, image upload/preview, character count, validation messages, cancel, and submit actions.
- **Authentication**: Use consistent, uncluttered login and registration layouts, preserve Django-rendered validation/help text, and keep the reciprocal sign-in/sign-up links.
- **Responsive behavior**: At compact widths, collapse multi-column layouts, keep controls reachable and legible, constrain image overflow, and avoid horizontal scrolling. Retain all essential actions without hover-only interaction.

## 6. Design System & UI

**Design direction**: Calm, welcoming editorial social feed: warm off-white page canvas, crisp white content surfaces, deep ink text, restrained indigo primary actions, and a small coral accent for liked/highlight states. Favor generous whitespace, clear content rhythm, subtle borders, and soft elevation over heavy gradients or excessive decoration.
**Component Library**: Pico.css
**Implementation approach**: Apply Pico.css as the accessible HTML baseline and layer a small project-specific token and component stylesheet over it. Scope overrides so Django-generated form markup and existing page-specific styles remain predictable.
**Tokens**: Define centralized CSS custom properties for canvas/surface, primary/accent, text/muted text, borders, focus ring, spacing, radii, and elevation. Use consistent type scale and line lengths for feed text and forms.
**Shared components**: Header/navigation, page container, primary/secondary buttons, tabs, avatar, post card, action row, suggestion row, profile summary, form fields/errors, flash messages, empty state, and pagination.
**Interaction states**: Provide visible hover, focus-visible, active, selected, liked, disabled, and validation/error treatments. Use reduced-motion-aware transitions and never communicate state with color alone.
**Page composition**: Desktop feed uses a readable central timeline with a secondary suggestions rail; smaller screens prioritize the timeline and move or collapse secondary content after it. Use a compact, responsive header rather than forcing desktop navigation onto narrow screens.

## 7. Accessibility & Responsive Requirements

- Use landmarks and logical heading order; make interactive controls native links, buttons, and forms with meaningful accessible names.
- Preserve keyboard operation and add a high-contrast `:focus-visible` treatment for navigation, tabs, actions, and form controls.
- Keep text/background contrast suitable for normal text and controls; pair color changes with labels or icons for liked/followed/selected states.
- Ensure avatar and post-image alternative text is useful and avoid redundant announcements for decorative imagery.
- Respect reduced-motion preference; do not make core actions depend on animation, hover, or JavaScript.
- Validate the layout at narrow mobile, tablet, and desktop breakpoints, including long usernames, long post text, validation errors, and posts with large images.

## 8. Delivery Plan & Acceptance

1. **Foundation**: Establish shared design tokens, typography, page background/container, and base responsive behavior while retaining the existing template inheritance structure.
2. **Navigation and feed**: Refresh the shared navigation, feed layout/tabs, suggestions rail, post card, empty state, and pagination.
3. **Profiles and post detail**: Apply the same visual language to profile summaries, edit-profile controls, comments, and post actions.
4. **Create and authentication**: Polish post composition, image preview/counter presentation, and login/registration forms and validation.
5. **Responsive and accessibility pass**: Verify focus, contrast, semantic controls, reduced motion, overflow handling, and compact navigation/layout behavior.
6. **Regression verification**: Run the existing Django test suite and manually verify all current routes and interactions, including normal form submission when JavaScript is unavailable.

**Acceptance criteria**
- Existing named routes, access restrictions, model fields, and user-facing behavior remain unchanged.
- Feed tabs, pagination, likes, follows, delete confirmation, comments, profile editing, registration, and login remain functional.
- Existing upload fields, image preview, character counter, validation errors, Django messages, and empty states remain visible and usable.
- Shared components are visually consistent; no page has horizontal overflow at mobile widths; keyboard focus is visible throughout.
- Django tests pass, and UI verification covers authenticated and unauthenticated states at mobile and desktop sizes.

## 9. Risks & Constraints

- The project uses custom templates and project CSS, so the component-library baseline must be integrated carefully to avoid changing Django form layout or overriding existing page-specific styles unintentionally.
- User-generated content and image dimensions vary; layouts must safely handle long text and large uploads without clipping or overflow.
- This work intentionally avoids implementation-level backend changes. Any desired feature that requires new context data, routes, or model fields must be raised separately rather than silently added to the redesign.

