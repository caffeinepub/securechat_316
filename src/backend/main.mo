import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import OutCall "http-outcalls/outcall";

actor {
  include MixinStorage();

  // Types

  type ContactStatus = {
    #Pending;
    #Accepted;
    #Blocked;
  };

  type Contact = {
    principal : Principal;
    status : ContactStatus;
    addedAt : Int;
  };

  type MessageType = {
    #Text;
    #Image;
    #File;
    #Audio;
    #Video;
  };

  // Original Message type — UNCHANGED for stable variable compatibility.
  // DTN envelope metadata is stored separately in `dtnMetadata`.
  type Message = {
    id : Nat;
    conversationId : Nat;
    sender : Principal;
    content : Text;
    messageType : MessageType;
    mediaBlob : ?Storage.ExternalBlob;
    mediaName : ?Text;
    mediaSize : ?Nat64;
    replyToId : ?Nat;
    timestamp : Int;
    deleted : Bool;
    reactions : [(Principal, Text)];
  };

  // DTN envelope metadata stored alongside messages (keyed by messageUuid).
  // Stored separately to avoid breaking stable variable compatibility.
  type DtnMeta = {
    messageUuid : Text;
    messageId : Nat;       // the canister-assigned Message.id this belongs to
    conversationId : Nat;
    senderDeviceId : ?Text;
    recipientHint : ?Text;
    ttl : ?Int;
    hopCount : Nat;
    contentHash : ?Text;
    protocolVersion : Nat;
  };

  type ConversationType = {
    #Direct;
    #Group;
  };

  type GroupInfo = {
    name : Text;
    avatar : ?Storage.ExternalBlob;
    admin : Principal;
  };

  type Conversation = {
    id : Nat;
    conversationType : ConversationType;
    groupInfo : ?GroupInfo;
    createdAt : Int;
  };

  type ConversationPreview = {
    id : Nat;
    conversationType : ConversationType;
    groupInfo : ?GroupInfo;
    lastMessageTime : ?Int;
    unreadCount : Nat;
    members : [PublicProfile];
  };

  type PublicProfile = {
    principal : Principal;
    name : Text;
    bio : Text;
    avatar : ?Storage.ExternalBlob;
    lastSeen : Int;
  };

  type DiscoveryMode = {
    #Open;    // findable by name search
    #IdOnly;  // only findable by II principal
    #Hidden;  // not findable by anyone
  };

  type Profile = {
    name : Text;
    bio : Text;
    avatar : ?Storage.ExternalBlob;
    lastSeen : Int;
    email : ?Text;
    emailVerified : Bool;
    twoFactorEnabled : Bool;
  };

  type StatusUpdate = {
    id : Nat;
    author : Principal;
    content : Text;
    mediaBlob : ?Storage.ExternalBlob;
    postedAt : Int;
    expiresAt : Int;
    reactions : [(Principal, Text)];
  };

  type NotificationKind = {
    #NewMessage;
    #Mention;
    #ContactRequest;
    #ContactAccepted;
    #GroupInvite;
    #StatusReaction;
  };

  type Notification = {
    id : Nat;
    kind : NotificationKind;
    timestamp : Int;
    read : Bool;
    conversationId : ?Nat;
    fromPrincipal : ?Principal;
  };

  type DisappearingTimer = {
    #Off;
    #Hours24;
    #Days7;
    #Days30;
  };

  type Report = {
    reporter : Principal;
    reported : Principal;
    reason : Text;
    timestamp : Int;
  };

  type WrappedGroupKey = {
    encryptedKey : Blob;
    wrappedBy : Principal;
  };

  type VetKdKeyId = {
    curve : { #bls12_381_g2 };
    name : Text;
  };

  type VetKdApi = actor {
    vetkd_public_key : ({
      canister_id : ?Principal;
      context : Blob;
      key_id : VetKdKeyId;
    }) -> async ({ public_key : Blob });
    vetkd_derive_key : ({
      context : Blob;
      input : Blob;
      key_id : VetKdKeyId;
      transport_public_key : Blob;
    }) -> async ({ encrypted_key : Blob });
  };

  type EncryptedEmailConfig = {
    encryptedApiKey : Blob;
    senderEmail : Text;
  };

  type SyncSession = {
    offer : Text;
    var answer : ?Text;
    createdAt : Int;
  };


  // State

  var userProfiles : Map.Map<Principal, Profile> = Map.empty();
  var userDiscoveryModes : Map.Map<Principal, DiscoveryMode> = Map.empty();
  var userContacts : Map.Map<Principal, Map.Map<Principal, Contact>> = Map.empty();
  var conversations : Map.Map<Nat, Conversation> = Map.empty();
  var conversationMessages : Map.Map<Nat, List.List<Message>> = Map.empty();
  var conversationMembers : Map.Map<Nat, Map.Map<Principal, Bool>> = Map.empty();
  var userConversations : Map.Map<Principal, Map.Map<Nat, Bool>> = Map.empty();
  var readCursors : Map.Map<Principal, Map.Map<Nat, Nat>> = Map.empty();
  var userStatuses : Map.Map<Principal, List.List<StatusUpdate>> = Map.empty();
  var blockedUsers : Map.Map<Principal, Map.Map<Principal, Bool>> = Map.empty();
  var reports : List.List<Report> = List.empty();
  var conversationTimers : Map.Map<Nat, DisappearingTimer> = Map.empty();
  var userNotifications : Map.Map<Principal, List.List<Notification>> = Map.empty();

  var nextConversationId : Nat = 1;
  var nextMessageId : Nat = 1;
  var nextStatusId : Nat = 1;
  var nextNotificationId : Nat = 1;
  // Email 2FA state

  type PendingOtp = {
    code : Text;
    email : Text;
    expiry : Int;
    attempts : Nat;
  };

  var pendingOtps : Map.Map<Principal, PendingOtp> = Map.empty();

  // Typing indicators (transient — not persisted)
  // Maps conversationId -> Map<Principal, lastTypingTimestamp>
  transient var typingIndicators : Map.Map<Nat, Map.Map<Principal, Int>> = Map.empty();

  // File storage state (kept from template)
  type FileId = Nat;
  type FileMetadata = {
    id : FileId;
    name : Text;
    size : Nat64;
    uploadDate : Int;
    fileType : Text;
    blob : Storage.ExternalBlob;
  };
  var userFiles : Map.Map<Principal, Map.Map<FileId, FileMetadata>> = Map.empty();
  var userNextFileId : Map.Map<Principal, Nat> = Map.empty();

  // E2EE state
  var userPublicKeys : Map.Map<Principal, Blob> = Map.empty();
  var conversationGroupKeys : Map.Map<Nat, Map.Map<Principal, WrappedGroupKey>> = Map.empty();
  // Retained for upgrade compatibility (threads feature removed)
  var groupThreads : Map.Map<Nat, Map.Map<Nat, Bool>> = Map.empty();

  // DTN deduplication: tracks seen messageUuids to prevent duplicate storage
  var seenUuids : Map.Map<Text, Bool> = Map.empty();

  // DTN envelope metadata: stored separately from Message to avoid stable variable incompatibility
  var dtnMetadata : Map.Map<Text, DtnMeta> = Map.empty();  // keyed by messageUuid
  var messageIdToUuid : Map.Map<Nat, Text> = Map.empty();  // reverse lookup: Message.id -> messageUuid

  // vetKD encrypted email config
  var userEncryptedEmailConfigs : Map.Map<Principal, EncryptedEmailConfig> = Map.empty();
  var syncSessions : Map.Map<Text, SyncSession> = Map.empty();
  var nextSyncSessionId : Nat = 1;

  // Constants

  let vetKdApi : VetKdApi = actor ("aaaaa-aa");
  let VETKD_KEY_NAME = "dfx_test_key";

  let MAX_MESSAGE_LENGTH = 10_000;
  let MAX_FILE_NAME_LENGTH = 255;
  let MAX_FILE_SIZE : Nat64 = 10_485_760; // 10 MB
  let MAX_STATUS_LENGTH = 500;
  let MAX_GROUP_NAME_LENGTH = 100;
  let MAX_OTP_ATTEMPTS = 5;
  let MAX_IMPORT_CONTACTS = 100;
  let MAX_GROUP_MEMBERS = 256;
  let MAX_MENTIONED_PRINCIPALS = 50;
  let MAX_REPORT_REASON_LENGTH = 1000;
  let MAX_NOTIFICATIONS = 200;

  // Helpers

  func requireAuth(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Not authenticated");
    };
  };

  func getMap<V>(store : Map.Map<Principal, Map.Map<Principal, V>>, user : Principal) : Map.Map<Principal, V> {
    switch (store.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Principal, V>();
        store.add(user, m);
        m;
      };
    };
  };

  func getNatMap<V>(store : Map.Map<Principal, Map.Map<Nat, V>>, user : Principal) : Map.Map<Nat, V> {
    switch (store.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Nat, V>();
        store.add(user, m);
        m;
      };
    };
  };

  func getUserContacts(user : Principal) : Map.Map<Principal, Contact> {
    getMap(userContacts, user);
  };

  func getUserConversations(user : Principal) : Map.Map<Nat, Bool> {
    getNatMap(userConversations, user);
  };

  func getUserReadCursors(user : Principal) : Map.Map<Nat, Nat> {
    getNatMap(readCursors, user);
  };

  func getConversationMembers(convId : Nat) : Map.Map<Principal, Bool> {
    switch (conversationMembers.get(convId)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Principal, Bool>();
        conversationMembers.add(convId, m);
        m;
      };
    };
  };

  func getConversationMessages(convId : Nat) : List.List<Message> {
    switch (conversationMessages.get(convId)) {
      case (?l) { l };
      case (null) {
        let l = List.empty<Message>();
        conversationMessages.add(convId, l);
        l;
      };
    };
  };

  func isConversationMember(convId : Nat, user : Principal) : Bool {
    let members = getConversationMembers(convId);
    switch (members.get(user)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  func isBlocked(user : Principal, target : Principal) : Bool {
    switch (blockedUsers.get(user)) {
      case (?m) {
        switch (m.get(target)) {
          case (?_) { true };
          case (null) { false };
        };
      };
      case (null) { false };
    };
  };

  func isAcceptedContact(user : Principal, target : Principal) : Bool {
    let contacts = getUserContacts(user);
    switch (contacts.get(target)) {
      case (?c) {
        switch (c.status) {
          case (#Accepted) { true };
          case (_) { false };
        };
      };
      case (null) { false };
    };
  };

  func toPublicProfile(p : Principal) : PublicProfile {
    switch (userProfiles.get(p)) {
      case (?prof) {
        {
          principal = p;
          name = prof.name;
          bio = prof.bio;
          avatar = prof.avatar;
          lastSeen = prof.lastSeen;
        };
      };
      case (null) {
        {
          principal = p;
          name = "Unknown";
          bio = "";
          avatar = null;
          lastSeen = 0;
        };
      };
    };
  };

  func getUserFiles(user : Principal) : Map.Map<FileId, FileMetadata> {
    switch (userFiles.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<FileId, FileMetadata>();
        userFiles.add(user, m);
        m;
      };
    };
  };

  func addNotification(user : Principal, kind : NotificationKind, convId : ?Nat, from : ?Principal) {
    let notifs = switch (userNotifications.get(user)) {
      case (?l) { l };
      case (null) {
        let l = List.empty<Notification>();
        userNotifications.add(user, l);
        l;
      };
    };
    let id = nextNotificationId;
    nextNotificationId += 1;
    notifs.add({
      id;
      kind;
      timestamp = Time.now();
      read = false;
      conversationId = convId;
      fromPrincipal = from;
    });
    // Cap notification list to prevent unbounded growth
    if (notifs.size() > MAX_NOTIFICATIONS) {
      let arr = notifs.toArray();
      let pruned = List.empty<Notification>();
      for (i in arr.keys()) {
        if (i + MAX_NOTIFICATIONS >= arr.size()) {
          pruned.add(arr[i]);
        };
      };
      userNotifications.add(user, pruned);
    };
  };

  func timerToNanos(timer : DisappearingTimer) : ?Int {
    switch (timer) {
      case (#Off) { null };
      case (#Hours24) { ?(86_400_000_000_000) };
      case (#Days7) { ?(604_800_000_000_000) };
      case (#Days30) { ?(2_592_000_000_000_000) };
    };
  };

  func genFileId(user : Principal) : Nat {
    let id = switch (userNextFileId.get(user)) {
      case (?id) { id };
      case (null) { 1 };
    };
    userNextFileId.add(user, id + 1);
    id;
  };

  // Email 2FA helpers

  func escapeJsonString(s : Text) : Text {
    var result = "";
    for (c in s.chars()) {
      switch (c) {
        case ('\"') { result #= "\\\"" };
        case ('\\') { result #= "\\\\" };
        case ('\n') { result #= "\\n" };
        case ('\r') { result #= "\\r" };
        case ('\t') { result #= "\\t" };
        case (_) { result #= Text.fromChar(c) };
      };
    };
    result;
  };

  func buildEmailPayload(senderEmail : Text, senderName : Text, to : Text, subject : Text, htmlContent : Text) : Text {
    "{\"from\":\"" # escapeJsonString(senderName) # " <" # escapeJsonString(senderEmail) # ">\",\"to\":[\"" # escapeJsonString(to) # "\"],\"subject\":\"" # escapeJsonString(subject) # "\",\"html\":\"" # escapeJsonString(htmlContent) # "\"}";
  };

  func generateOtp() : async Text {
    let mgmt : actor { raw_rand : () -> async Blob } = actor ("aaaaa-aa");
    let randBytes = await mgmt.raw_rand();
    let iter = randBytes.vals();
    var n : Nat = 0;
    var i = 0;
    while (i < 4) {
      switch (iter.next()) {
        case (?byte) { n := n * 256 + byte.toNat() };
        case (null) {};
      };
      i += 1;
    };
    let code = n % 1_000_000;
    let raw = code.toText();
    let padding = 6 - raw.size() : Nat;
    var result = "";
    var j = 0;
    while (j < padding) {
      result #= "0";
      j += 1;
    };
    result # raw;
  };

  func cleanupExpiredMessages(convId : Nat) {
    switch (conversationTimers.get(convId)) {
      case (?timer) {
        switch (timerToNanos(timer)) {
          case (?dur) {
            let now = Time.now();
            let messages = getConversationMessages(convId);
            let kept = List.empty<Message>();
            for (msg in messages.values()) {
              if (msg.timestamp + dur >= now) {
                kept.add(msg);
              };
            };
            conversationMessages.add(convId, kept);
          };
          case (null) {};
        };
      };
      case (null) {};
    };
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Endpoints — Profile

  public query ({ caller }) func getProfile() : async ?Profile {
    requireAuth(caller);
    userProfiles.get(caller);
  };

  public shared ({ caller }) func setProfile(name : Text, bio : Text, avatar : ?Storage.ExternalBlob) : async () {
    requireAuth(caller);
    if (name == "") {
      Runtime.trap("Name cannot be empty");
    };
    if (name.size() > 100) {
      Runtime.trap("Name must be 100 characters or fewer");
    };
    if (bio.size() > 500) {
      Runtime.trap("Bio must be 500 characters or fewer");
    };
    let existing = userProfiles.get(caller);
    let now = Time.now();
    userProfiles.add(
      caller,
      {
        name;
        bio;
        avatar;
        lastSeen = now;
        email = switch (existing) {
          case (?p) { p.email };
          case (null) { null };
        };
        emailVerified = switch (existing) {
          case (?p) { p.emailVerified };
          case (null) { false };
        };
        twoFactorEnabled = switch (existing) {
          case (?p) { p.twoFactorEnabled };
          case (null) { false };
        };
      },
    );
  };

  public query ({ caller }) func getDiscoveryMode() : async DiscoveryMode {
    requireAuth(caller);
    switch (userDiscoveryModes.get(caller)) {
      case (?m) { m };
      case (null) { #Open };
    };
  };

  public shared ({ caller }) func updateDiscoveryMode(mode : DiscoveryMode) : async () {
    requireAuth(caller);
    userDiscoveryModes.add(caller, mode);
  };

  public query ({ caller }) func getPublicProfile(target : Principal) : async PublicProfile {
    requireAuth(caller);
    toPublicProfile(target);
  };

  // Endpoints — Contact Management

  public shared ({ caller }) func sendContactRequest(target : Principal) : async () {
    requireAuth(caller);
    if (caller == target) {
      Runtime.trap("Cannot add yourself as a contact");
    };
    if (isBlocked(target, caller)) {
      Runtime.trap("Cannot send request to this user");
    };
    // Hidden users cannot be found or added by anyone
    let targetMode = switch (userDiscoveryModes.get(target)) { case (?m) m; case (null) #Open };
    switch (targetMode) {
      case (#Hidden) { Runtime.trap("User not found") };
      case (_) {};
    };
    let callerContacts = getUserContacts(caller);
    switch (callerContacts.get(target)) {
      case (?c) {
        switch (c.status) {
          case (#Accepted) { Runtime.trap("Already a contact") };
          case (#Pending) { Runtime.trap("Request already sent") };
          case (#Blocked) { Runtime.trap("User is blocked") };
        };
      };
      case (null) {};
    };
    let now = Time.now();
    // Initiator gets addedAt = now + 1 so getPendingRequests can distinguish sender from receiver
    callerContacts.add(target, { principal = target; status = #Pending; addedAt = now + 1 });
    let targetContacts = getUserContacts(target);
    targetContacts.add(caller, { principal = caller; status = #Pending; addedAt = now });
    addNotification(target, #ContactRequest, null, ?caller);
  };

  public shared ({ caller }) func acceptContactRequest(from : Principal) : async () {
    requireAuth(caller);
    let callerContacts = getUserContacts(caller);
    let callerEntry = switch (callerContacts.get(from)) {
      case (?c) {
        switch (c.status) {
          case (#Pending) { c };
          case (_) { Runtime.trap("No pending request from this user") };
        };
      };
      case (null) { Runtime.trap("No pending request from this user") };
    };
    let fromContacts = getUserContacts(from);
    switch (fromContacts.get(caller)) {
      case (?fc) {
        if (callerEntry.addedAt > fc.addedAt) {
          Runtime.trap("Cannot accept your own contact request");
        };
      };
      case (null) { Runtime.trap("No pending request from this user") };
    };
    let now = Time.now();
    callerContacts.add(from, { principal = from; status = #Accepted; addedAt = now });
    fromContacts.add(caller, { principal = caller; status = #Accepted; addedAt = now });
    addNotification(from, #ContactAccepted, null, ?caller);
  };

  public shared ({ caller }) func rejectContactRequest(from : Principal) : async () {
    requireAuth(caller);
    let callerContacts = getUserContacts(caller);
    switch (callerContacts.get(from)) {
      case (?c) {
        switch (c.status) {
          case (#Pending) {};
          case (_) { Runtime.trap("No pending request from this user") };
        };
      };
      case (null) { Runtime.trap("No pending request from this user") };
    };
    callerContacts.remove(from);
    let fromContacts = getUserContacts(from);
    fromContacts.remove(caller);
  };

  public shared ({ caller }) func removeContact(target : Principal) : async () {
    requireAuth(caller);
    let callerContacts = getUserContacts(caller);
    callerContacts.remove(target);
    let targetContacts = getUserContacts(target);
    targetContacts.remove(caller);
  };

  public query ({ caller }) func getContacts() : async [(Contact, PublicProfile)] {
    requireAuth(caller);
    let contacts = getUserContacts(caller);
    let result = List.empty<(Contact, PublicProfile)>();
    for ((_, contact) in contacts.entries()) {
      result.add((contact, toPublicProfile(contact.principal)));
    };
    result.toArray();
  };

  public query ({ caller }) func getPendingRequests() : async [(Contact, PublicProfile)] {
    requireAuth(caller);
    let contacts = getUserContacts(caller);
    let result = List.empty<(Contact, PublicProfile)>();
    for ((_, contact) in contacts.entries()) {
      switch (contact.status) {
        case (#Pending) {
          // Only show requests FROM others (where they initiated)
          let fromContacts = getUserContacts(contact.principal);
          switch (fromContacts.get(caller)) {
            case (?fc) {
              switch (fc.status) {
                case (#Pending) {
                  // Check if caller did NOT initiate (target's addedAt == caller's addedAt means simultaneous)
                  if (contact.addedAt <= fc.addedAt) {
                    result.add((contact, toPublicProfile(contact.principal)));
                  };
                };
                case (_) {};
              };
            };
            case (null) {};
          };
        };
        case (_) {};
      };
    };
    result.toArray();
  };

  public shared ({ caller }) func blockUser(target : Principal) : async () {
    requireAuth(caller);
    let blocked = getMap(blockedUsers, caller);
    blocked.add(target, true);
    let callerContacts = getUserContacts(caller);
    callerContacts.remove(target);
  };

  public shared ({ caller }) func unblockUser(target : Principal) : async () {
    requireAuth(caller);
    let blocked = getMap(blockedUsers, caller);
    blocked.remove(target);
  };

  public query ({ caller }) func getBlockedUsers() : async [PublicProfile] {
    requireAuth(caller);
    switch (blockedUsers.get(caller)) {
      case (?m) {
        let result = List.empty<PublicProfile>();
        for ((p, _) in m.entries()) {
          result.add(toPublicProfile(p));
        };
        result.toArray();
      };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func reportUser(target : Principal, reason : Text) : async () {
    requireAuth(caller);
    if (reason == "") {
      Runtime.trap("Report reason cannot be empty");
    };
    if (reason.size() > MAX_REPORT_REASON_LENGTH) {
      Runtime.trap("Report reason exceeds maximum length");
    };
    // Prevent duplicate reports from same reporter for same target
    for (r in reports.values()) {
      if (r.reporter == caller and r.reported == target) {
        Runtime.trap("You have already reported this user");
      };
    };
    reports.add({
      reporter = caller;
      reported = target;
      reason;
      timestamp = Time.now();
    });
  };

  public query ({ caller }) func searchUsers(searchText : Text) : async [PublicProfile] {
    requireAuth(caller);
    if (searchText.size() < 2) {
      Runtime.trap("Search query must be at least 2 characters");
    };
    let queryLower = searchText.toLower();
    let result = List.empty<PublicProfile>();
    var count = 0;
    for ((p, prof) in userProfiles.entries()) {
      if (count < 20 and p != caller) {
        let discoveryMode = switch (userDiscoveryModes.get(p)) { case (?m) m; case (null) #Open };
        switch (discoveryMode) {
          case (#Open) {
            let nameLower = prof.name.toLower();
            if (nameLower.contains(#text queryLower)) {
              if (not isBlocked(p, caller)) {
                result.add(toPublicProfile(p));
                count += 1;
              };
            };
          };
          case (_) {}; // IdOnly and Hidden users don't appear in name search
        };
      };
    };
    result.toArray();
  };

  public query ({ caller }) func getShareId() : async Text {
    requireAuth(caller);
    caller.toText();
  };

  public shared ({ caller }) func addContactByPrincipal(principalText : Text) : async () {
    requireAuth(caller);
    let target = Principal.fromText(principalText);
    if (target.isAnonymous()) {
      Runtime.trap("Invalid principal");
    };
    if (caller == target) {
      Runtime.trap("Cannot add yourself as a contact");
    };
    if (isBlocked(target, caller)) {
      Runtime.trap("Cannot send request to this user");
    };
    // Hidden users cannot be found or added by anyone
    let targetMode = switch (userDiscoveryModes.get(target)) { case (?m) m; case (null) #Open };
    switch (targetMode) {
      case (#Hidden) { Runtime.trap("User not found") };
      case (_) {};
    };
    let callerContacts = getUserContacts(caller);
    switch (callerContacts.get(target)) {
      case (?c) {
        switch (c.status) {
          case (#Accepted) { Runtime.trap("Already a contact") };
          case (#Pending) { Runtime.trap("Request already sent") };
          case (#Blocked) { Runtime.trap("User is blocked") };
        };
      };
      case (null) {};
    };
    let now = Time.now();
    // Initiator gets addedAt = now + 1 so getPendingRequests can distinguish sender from receiver
    callerContacts.add(target, { principal = target; status = #Pending; addedAt = now + 1 });
    let targetContacts = getUserContacts(target);
    targetContacts.add(caller, { principal = caller; status = #Pending; addedAt = now });
    addNotification(target, #ContactRequest, null, ?caller);
  };

  // Endpoints — Data Export/Import

  type ExportContact = {
    principalText : Text;
    status : ContactStatus;
    addedAt : Int;
  };

  type ExportData = {
    profile : { name : Text; bio : Text; email : ?Text; emailVerified : Bool };
    contacts : [ExportContact];
    exportedAt : Int;
  };

  public query ({ caller }) func exportUserData() : async ExportData {
    requireAuth(caller);
    let prof = switch (userProfiles.get(caller)) {
      case (?p) {
        {
          name = p.name;
          bio = p.bio;
          email = p.email;
          emailVerified = p.emailVerified;
        };
      };
      case (null) {
        { name = ""; bio = ""; email = null : ?Text; emailVerified = false };
      };
    };
    let contactsList = getUserContacts(caller);
    let exportContacts = List.empty<ExportContact>();
    for ((_, contact) in contactsList.entries()) {
      exportContacts.add({
        principalText = contact.principal.toText();
        status = contact.status;
        addedAt = contact.addedAt;
      });
    };
    {
      profile = prof;
      contacts = exportContacts.toArray();
      exportedAt = Time.now();
    };
  };

  public shared ({ caller }) func importUserData(data : ExportData) : async {
    contactsRequested : Nat;
  } {
    requireAuth(caller);
    // Restore profile if caller has no profile
    switch (userProfiles.get(caller)) {
      case (?_) {};
      case (null) {
        if (data.profile.name != "") {
          let now = Time.now();
          userProfiles.add(
            caller,
            {
              name = data.profile.name;
              bio = data.profile.bio;
              avatar = null;
              lastSeen = now;
              email = null;
              emailVerified = false;
              twoFactorEnabled = false;
            },
          );
        };
      };
    };
    // Send contact requests for each contact (capped to prevent spam)
    if (data.contacts.size() > MAX_IMPORT_CONTACTS) {
      Runtime.trap("Import contains too many contacts (max " # MAX_IMPORT_CONTACTS.toText() # ")");
    };
    var requested : Nat = 0;
    for (ec in data.contacts.vals()) {
      let target = Principal.fromText(ec.principalText);
      if (not target.isAnonymous() and caller != target and not isBlocked(target, caller)) {
        let callerContacts = getUserContacts(caller);
        switch (callerContacts.get(target)) {
          case (?_) {};
          case (null) {
            let now = Time.now();
            callerContacts.add(target, { principal = target; status = #Pending; addedAt = now + 1 });
            let targetContacts = getUserContacts(target);
            targetContacts.add(caller, { principal = caller; status = #Pending; addedAt = now });
            addNotification(target, #ContactRequest, null, ?caller);
            requested += 1;
          };
        };
      };
    };
    { contactsRequested = requested };
  };

  // Endpoints — Direct Messaging

  public shared ({ caller }) func startDirectChat(target : Principal) : async Nat {
    requireAuth(caller);
    if (caller == target) {
      Runtime.trap("Cannot chat with yourself");
    };
    if (isBlocked(target, caller) or isBlocked(caller, target)) {
      Runtime.trap("Cannot start chat with this user");
    };
    // Require accepted contact relationship
    if (not isAcceptedContact(caller, target)) {
      Runtime.trap("Cannot start chat — user is not an accepted contact");
    };
    // Check if a direct conversation already exists between these two
    let callerConvs = getUserConversations(caller);
    for ((convId, _) in callerConvs.entries()) {
      switch (conversations.get(convId)) {
        case (?conv) {
          switch (conv.conversationType) {
            case (#Direct) {
              if (isConversationMember(convId, target)) {
                return convId;
              };
            };
            case (_) {};
          };
        };
        case (null) {};
      };
    };
    // Create new direct conversation
    let convId = nextConversationId;
    nextConversationId += 1;
    conversations.add(
      convId,
      {
        id = convId;
        conversationType = #Direct;
        groupInfo = null;
        createdAt = Time.now();
      },
    );
    let members = getConversationMembers(convId);
    members.add(caller, true);
    members.add(target, true);
    getUserConversations(caller).add(convId, true);
    getUserConversations(target).add(convId, true);
    convId;
  };

  public shared ({ caller }) func sendMessage(
    conversationId : Nat,
    content : Text,
    messageType : MessageType,
    mediaBlob : ?Storage.ExternalBlob,
    mediaName : ?Text,
    mediaSize : ?Nat64,
    replyToId : ?Nat,
    mentionedPrincipals : ?[Principal],
  ) : async Nat {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    if (content == "" and mediaBlob == null) {
      Runtime.trap("Message cannot be empty");
    };
    if (content.size() > MAX_MESSAGE_LENGTH) {
      Runtime.trap("Message exceeds maximum length");
    };
    switch (mediaName) {
      case (?name) {
        if (name.size() > MAX_FILE_NAME_LENGTH) {
          Runtime.trap("File name exceeds maximum length");
        };
      };
      case (null) {};
    };
    switch (mediaSize) {
      case (?size) {
        if (size > MAX_FILE_SIZE) {
          Runtime.trap("File exceeds maximum size of 10 MB");
        };
      };
      case (null) {};
    };
    // Limit mentioned principals to prevent abuse
    switch (mentionedPrincipals) {
      case (?principals) {
        if (principals.size() > MAX_MENTIONED_PRINCIPALS) {
          Runtime.trap("Too many mentioned users (max " # MAX_MENTIONED_PRINCIPALS.toText() # ")");
        };
      };
      case (null) {};
    };
    // Check blocked status for direct chats
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.conversationType) {
          case (#Direct) {
            let members = getConversationMembers(conversationId);
            for ((p, _) in members.entries()) {
              if (p != caller) {
                if (isBlocked(p, caller) or isBlocked(caller, p)) {
                  Runtime.trap("Cannot send messages in this conversation");
                };
              };
            };
          };
          case (_) {};
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
    let msgId = nextMessageId;
    nextMessageId += 1;
    let msg : Message = {
      id = msgId;
      conversationId;
      sender = caller;
      content;
      messageType;
      mediaBlob;
      mediaName;
      mediaSize;
      replyToId;
      timestamp = Time.now();
      deleted = false;
      reactions = [];
    };
    let messages = getConversationMessages(conversationId);
    messages.add(msg);
    cleanupExpiredMessages(conversationId);
    // Update sender's lastSeen
    switch (userProfiles.get(caller)) {
      case (?prof) {
        userProfiles.add(caller, { prof with lastSeen = Time.now() });
      };
      case (null) {};
    };
    // Notify other members
    let allMembers = getConversationMembers(conversationId);
    for ((p, _) in allMembers.entries()) {
      if (p != caller) {
        addNotification(p, #NewMessage, ?conversationId, ?caller);
      };
    };
    // Handle @mentions — use explicit principals if provided (E2EE), otherwise parse from content
    switch (mentionedPrincipals) {
      case (?principals) {
        for (mp in principals.vals()) {
          if (mp != caller and isConversationMember(conversationId, mp)) {
            addNotification(mp, #Mention, ?conversationId, ?caller);
          };
        };
      };
      case (null) {
        // Parse @mentions by iterating characters
        let mentionedNames = List.empty<Text>();
        var i = 0;
        let contentSize = content.size();
        let contentChars = List.empty<Char>();
        for (c in content.chars()) {
          contentChars.add(c);
        };
        let charArray = contentChars.toArray();
        while (i < contentSize) {
          if (charArray[i] == '@') {
            i += 1;
            var nameChars = List.empty<Char>();
            while (i < contentSize and charArray[i] != ' ' and charArray[i] != '\n' and charArray[i] != '@') {
              nameChars.add(charArray[i]);
              i += 1;
            };
            if (nameChars.size() > 0) {
              var name = "";
              for (nc in nameChars.values()) {
                name #= Text.fromChar(nc);
              };
              mentionedNames.add(name.toLower());
            };
          } else {
            i += 1;
          };
        };
        for ((p, _) in allMembers.entries()) {
          if (p != caller) {
            switch (userProfiles.get(p)) {
              case (?prof) {
                let nameLower = prof.name.toLower();
                for (mentioned in mentionedNames.values()) {
                  if (nameLower.contains(#text mentioned)) {
                    addNotification(p, #Mention, ?conversationId, ?caller);
                  };
                };
              };
              case (null) {};
            };
          };
        };
      };
    };
    msgId;
  };

  public query ({ caller }) func getMessages(conversationId : Nat, beforeTimestamp : ?Int, limit : Nat) : async [Message] {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    let messages = getConversationMessages(conversationId);
    let effectiveLimit = if (limit == 0 or limit > 100) { 50 } else { limit };
    let now = Time.now();
    let timerDuration = switch (conversationTimers.get(conversationId)) {
      case (?t) { timerToNanos(t) };
      case (null) { null };
    };
    // Messages are in chronological order; collect all matching, then take last N
    let all = List.empty<Message>();
    for (msg in messages.values()) {
      if (msg.deleted) {} else {
        // Filter out expired disappearing messages
        let expired = switch (timerDuration) {
          case (?dur) { msg.timestamp + dur < now };
          case (null) { false };
        };
        if (expired) {} else {
          switch (beforeTimestamp) {
            case (?ts) {
              if (msg.timestamp < ts) {
                all.add(msg);
              };
            };
            case (null) {
              all.add(msg);
            };
          };
        };
      };
    };
    // Take last `effectiveLimit` messages
    let arr = all.toArray();
    let result = List.empty<Message>();
    for (i in arr.keys()) {
      if (i + effectiveLimit >= arr.size()) {
        result.add(arr[i]);
      };
    };
    result.toArray();
  };

  // DTN: cursor-based incremental sync — replaces full-refetch polling
  public query ({ caller }) func getMessagesSince(conversationId : Nat, fromMessageId : Nat, limit : Nat) : async [Message] {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    let messages = getConversationMessages(conversationId);
    let effectiveLimit = if (limit == 0 or limit > 100) { 50 } else { limit };
    let now = Time.now();
    let timerDuration = switch (conversationTimers.get(conversationId)) {
      case (?t) { timerToNanos(t) };
      case (null) { null };
    };
    let result = List.empty<Message>();
    for (msg in messages.values()) {
      if (not msg.deleted and msg.id > fromMessageId) {
        let expired = switch (timerDuration) {
          case (?dur) { msg.timestamp + dur < now };
          case (null) { false };
        };
        if (not expired) {
          result.add(msg);
        };
      };
    };
    let arr = result.toArray();
    let limited = List.empty<Message>();
    var count = 0;
    for (msg in arr.vals()) {
      if (count < effectiveLimit) {
        limited.add(msg);
        count += 1;
      };
    };
    limited.toArray();
  };

  // DTN: send a message with full envelope metadata
  // Existing sendMessage is unchanged; this is a new additive function
  public shared ({ caller }) func sendMessageWithDtn(
    conversationId : Nat,
    content : Text,
    messageType : MessageType,
    mediaBlob : ?Storage.ExternalBlob,
    mediaName : ?Text,
    mediaSize : ?Nat64,
    replyToId : ?Nat,
    mentionedPrincipals : ?[Principal],
    messageUuid : ?Text,
    senderDeviceId : ?Text,
    recipientHint : ?Text,
    ttl : ?Int,
  ) : async Nat {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    if (content == "" and mediaBlob == null) {
      Runtime.trap("Message cannot be empty");
    };
    if (content.size() > MAX_MESSAGE_LENGTH) {
      Runtime.trap("Message exceeds maximum length");
    };
    // DTN deduplication: idempotent send
    switch (messageUuid) {
      case (?uuid) {
        if (seenUuids.get(uuid) != null) {
          return 0; // already stored — return silently
        };
        seenUuids.add(uuid, true);
      };
      case (null) {};
    };
    // Check blocked status for direct chats
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.conversationType) {
          case (#Direct) {
            let members = getConversationMembers(conversationId);
            for ((p, _) in members.entries()) {
              if (p != caller) {
                if (isBlocked(p, caller) or isBlocked(caller, p)) {
                  Runtime.trap("Cannot send messages in this conversation");
                };
              };
            };
          };
          case (_) {};
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
    let msgId = nextMessageId;
    nextMessageId += 1;
    let msg : Message = {
      id = msgId;
      conversationId;
      sender = caller;
      content;
      messageType;
      mediaBlob;
      mediaName;
      mediaSize;
      replyToId;
      timestamp = Time.now();
      deleted = false;
      reactions = [];
    };
    let messages = getConversationMessages(conversationId);
    messages.add(msg);
    // Store DTN envelope metadata separately (avoids stable variable incompatibility)
    switch (messageUuid) {
      case (?uuid) {
        let meta : DtnMeta = {
          messageUuid = uuid;
          messageId = msgId;
          conversationId;
          senderDeviceId;
          recipientHint;
          ttl;
          hopCount = 0;
          contentHash = null;
          protocolVersion = 1;
        };
        dtnMetadata.add(uuid, meta);
        messageIdToUuid.add(msgId, uuid);
      };
      case (null) {};
    };
    cleanupExpiredMessages(conversationId);
    switch (userProfiles.get(caller)) {
      case (?prof) {
        userProfiles.add(caller, { prof with lastSeen = Time.now() });
      };
      case (null) {};
    };
    let allMembers = getConversationMembers(conversationId);
    for ((p, _) in allMembers.entries()) {
      if (p != caller) {
        addNotification(p, #NewMessage, ?conversationId, ?caller);
      };
    };
    switch (mentionedPrincipals) {
      case (?principals) {
        for (mp in principals.vals()) {
          if (mp != caller and isConversationMember(conversationId, mp)) {
            addNotification(mp, #Mention, ?conversationId, ?caller);
          };
        };
      };
      case (null) {};
    };
    msgId;
  };

  public query ({ caller }) func getConversations() : async [ConversationPreview] {
    requireAuth(caller);
    let callerConvs = getUserConversations(caller);
    let result = List.empty<ConversationPreview>();
    for ((convId, _) in callerConvs.entries()) {
      switch (conversations.get(convId)) {
        case (?conv) {
          let messages = getConversationMessages(convId);
          var lastMsgTime : ?Int = null;
          // Find last non-deleted message timestamp
          for (msg in messages.values()) {
            if (not msg.deleted) {
              lastMsgTime := ?msg.timestamp;
            };
          };
          // Count unread
          let cursors = getUserReadCursors(caller);
          let lastReadId = switch (cursors.get(convId)) {
            case (?id) { id };
            case (null) { 0 };
          };
          var unread = 0;
          for (msg in messages.values()) {
            if (msg.id > lastReadId and msg.sender != caller and not msg.deleted) {
              unread += 1;
            };
          };
          // Get member profiles
          let memberProfiles = List.empty<PublicProfile>();
          let members = getConversationMembers(convId);
          for ((p, _) in members.entries()) {
            if (p != caller) {
              memberProfiles.add(toPublicProfile(p));
            };
          };
          result.add({
            id = conv.id;
            conversationType = conv.conversationType;
            groupInfo = conv.groupInfo;
            lastMessageTime = lastMsgTime;
            unreadCount = unread;
            members = memberProfiles.toArray();
          });
        };
        case (null) {};
      };
    };
    result.toArray();
  };

  public shared ({ caller }) func markAsRead(conversationId : Nat, upToMessageId : Nat) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    let cursors = getUserReadCursors(caller);
    cursors.add(conversationId, upToMessageId);
  };

  public shared ({ caller }) func deleteMessage(conversationId : Nat, messageId : Nat) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    let messages = getConversationMessages(conversationId);
    let updated = List.empty<Message>();
    var found = false;
    for (msg in messages.values()) {
      if (msg.id == messageId) {
        if (msg.sender != caller) {
          Runtime.trap("Can only delete your own messages");
        };
        updated.add({
          msg with content = "Message deleted";
          deleted = true;
          mediaBlob = null;
          mediaName = null;
          mediaSize = null;
        });
        found := true;
      } else {
        updated.add(msg);
      };
    };
    if (not found) {
      Runtime.trap("Message not found");
    };
    conversationMessages.add(conversationId, updated);
  };

  public shared ({ caller }) func addReaction(conversationId : Nat, messageId : Nat, emoji : Text) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    let messages = getConversationMessages(conversationId);
    let updated = List.empty<Message>();
    var found = false;
    for (msg in messages.values()) {
      if (msg.id == messageId) {
        found := true;
        // Remove existing reaction from this user, then add new one
        let newReactions = List.empty<(Principal, Text)>();
        for (r in msg.reactions.vals()) {
          if (r.0 != caller) {
            newReactions.add(r);
          };
        };
        newReactions.add((caller, emoji));
        updated.add({ msg with reactions = newReactions.toArray() });
      } else {
        updated.add(msg);
      };
    };
    if (not found) {
      Runtime.trap("Message not found");
    };
    conversationMessages.add(conversationId, updated);
  };

  public shared ({ caller }) func removeReaction(conversationId : Nat, messageId : Nat, emoji : Text) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    let messages = getConversationMessages(conversationId);
    let updated = List.empty<Message>();
    var found = false;
    for (msg in messages.values()) {
      if (msg.id == messageId) {
        found := true;
        let newReactions = List.empty<(Principal, Text)>();
        for (r in msg.reactions.vals()) {
          if (not (r.0 == caller and r.1 == emoji)) {
            newReactions.add(r);
          };
        };
        updated.add({ msg with reactions = newReactions.toArray() });
      } else {
        updated.add(msg);
      };
    };
    if (not found) {
      Runtime.trap("Message not found");
    };
    conversationMessages.add(conversationId, updated);
  };

  // Endpoints — Group Chats

  public shared ({ caller }) func createGroup(name : Text, memberPrincipals : [Principal], avatar : ?Storage.ExternalBlob) : async Nat {
    requireAuth(caller);
    if (name == "") {
      Runtime.trap("Group name cannot be empty");
    };
    if (name.size() > MAX_GROUP_NAME_LENGTH) {
      Runtime.trap("Group name must be 100 characters or fewer");
    };
    if (memberPrincipals.size() + 1 > MAX_GROUP_MEMBERS) {
      Runtime.trap("Group cannot exceed " # MAX_GROUP_MEMBERS.toText() # " members");
    };
    let convId = nextConversationId;
    nextConversationId += 1;
    conversations.add(
      convId,
      {
        id = convId;
        conversationType = #Group;
        groupInfo = ?{
          name;
          avatar;
          admin = caller;
        };
        createdAt = Time.now();
      },
    );
    let members = getConversationMembers(convId);
    members.add(caller, true);
    getUserConversations(caller).add(convId, true);
    for (p in memberPrincipals.vals()) {
      if (p != caller and not p.isAnonymous()) {
        members.add(p, true);
        getUserConversations(p).add(convId, true);
      };
    };
    convId;
  };

  public shared ({ caller }) func updateGroup(conversationId : Nat, name : ?Text, avatar : ?Storage.ExternalBlob) : async () {
    requireAuth(caller);
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            if (gi.admin != caller) {
              Runtime.trap("Only group admin can update the group");
            };
            let newName = switch (name) {
              case (?n) {
                if (n == "") { Runtime.trap("Group name cannot be empty") };
                if (n.size() > MAX_GROUP_NAME_LENGTH) {
                  Runtime.trap("Group name must be 100 characters or fewer");
                };
                n;
              };
              case (null) { gi.name };
            };
            conversations.add(
              conversationId,
              {
                conv with groupInfo = ?{
                  gi with name = newName;
                  avatar;
                };
              },
            );
          };
          case (null) { Runtime.trap("Not a group conversation") };
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
  };

  public shared ({ caller }) func addGroupMember(conversationId : Nat, member : Principal) : async () {
    requireAuth(caller);
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            if (gi.admin != caller) {
              Runtime.trap("Only group admin can add members");
            };
            let members = getConversationMembers(conversationId);
            // Enforce group member limit
            var memberCount : Nat = 0;
            for (_ in members.entries()) {
              memberCount += 1;
            };
            if (memberCount >= MAX_GROUP_MEMBERS) {
              Runtime.trap("Group cannot exceed " # MAX_GROUP_MEMBERS.toText() # " members");
            };
            members.add(member, true);
            getUserConversations(member).add(conversationId, true);
            addNotification(member, #GroupInvite, ?conversationId, ?caller);
          };
          case (null) { Runtime.trap("Not a group conversation") };
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
  };

  public shared ({ caller }) func removeGroupMember(conversationId : Nat, member : Principal) : async () {
    requireAuth(caller);
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            if (gi.admin != caller) {
              Runtime.trap("Only group admin can remove members");
            };
            if (member == caller) {
              Runtime.trap("Admin cannot remove themselves; use leaveGroup");
            };
            let members = getConversationMembers(conversationId);
            members.remove(member);
            getUserConversations(member).remove(conversationId);
          };
          case (null) { Runtime.trap("Not a group conversation") };
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
  };

  public shared ({ caller }) func leaveGroup(conversationId : Nat) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this group");
    };
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            let members = getConversationMembers(conversationId);
            members.remove(caller);
            getUserConversations(caller).remove(conversationId);
            // If admin leaves, assign next member as admin
            if (gi.admin == caller) {
              var newAdmin : ?Principal = null;
              for ((p, _) in members.entries()) {
                switch (newAdmin) {
                  case (null) { newAdmin := ?p };
                  case (?_) {};
                };
              };
              switch (newAdmin) {
                case (?na) {
                  conversations.add(
                    conversationId,
                    {
                      conv with groupInfo = ?{ gi with admin = na };
                    },
                  );
                };
                case (null) {
                  // No members left — clean up
                  conversations.remove(conversationId);
                };
              };
            };
          };
          case (null) { Runtime.trap("Not a group conversation") };
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
  };

  public shared ({ caller }) func deleteGroup(conversationId : Nat) : async () {
    requireAuth(caller);
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            if (gi.admin != caller) {
              Runtime.trap("Only group admin can delete the group");
            };
            // Remove conversation from all members user lists
            let members = getConversationMembers(conversationId);
            for ((p, _) in members.entries()) {
              getUserConversations(p).remove(conversationId);
            };
            // Remove all group data
            conversationMembers.remove(conversationId);
            conversationMessages.remove(conversationId);
            conversationGroupKeys.remove(conversationId);
            conversations.remove(conversationId);
          };
          case (null) { Runtime.trap("Not a group conversation") };
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
  };

  public query ({ caller }) func getGroupInfo(conversationId : Nat) : async {
    name : Text;
    avatar : ?Storage.ExternalBlob;
    admin : Principal;
    members : [PublicProfile];
  } {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this group");
    };
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            let memberProfiles = List.empty<PublicProfile>();
            let members = getConversationMembers(conversationId);
            for ((p, _) in members.entries()) {
              memberProfiles.add(toPublicProfile(p));
            };
            {
              name = gi.name;
              avatar = gi.avatar;
              admin = gi.admin;
              members = memberProfiles.toArray();
            };
          };
          case (null) { Runtime.trap("Not a group conversation") };
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
  };

  // Endpoints — Status Updates

  public shared ({ caller }) func postStatus(content : Text, mediaBlob : ?Storage.ExternalBlob) : async Nat {
    requireAuth(caller);
    if (content == "" and mediaBlob == null) {
      Runtime.trap("Status cannot be empty");
    };
    if (content.size() > MAX_STATUS_LENGTH) {
      Runtime.trap("Status exceeds maximum length");
    };
    let statusId = nextStatusId;
    nextStatusId += 1;
    let now = Time.now();
    let status : StatusUpdate = {
      id = statusId;
      author = caller;
      content;
      mediaBlob;
      postedAt = now;
      expiresAt = now + 86_400_000_000_000; // 24 hours in nanoseconds
      reactions = [];
    };
    let statuses = switch (userStatuses.get(caller)) {
      case (?l) { l };
      case (null) {
        let l = List.empty<StatusUpdate>();
        userStatuses.add(caller, l);
        l;
      };
    };
    statuses.add(status);
    statusId;
  };

  public query ({ caller }) func getContactStatuses() : async [StatusUpdate] {
    requireAuth(caller);
    let now = Time.now();
    let result = List.empty<StatusUpdate>();
    let contacts = getUserContacts(caller);
    for ((p, contact) in contacts.entries()) {
      switch (contact.status) {
        case (#Accepted) {
          switch (userStatuses.get(p)) {
            case (?statuses) {
              for (s in statuses.values()) {
                if (s.expiresAt > now) {
                  result.add(s);
                };
              };
            };
            case (null) {};
          };
        };
        case (_) {};
      };
    };
    // Sort by postedAt descending
    result.sortInPlace(func(a, b) { Int.compare(b.postedAt, a.postedAt) });
    result.toArray();
  };

  public query ({ caller }) func getMyStatuses() : async [StatusUpdate] {
    requireAuth(caller);
    let now = Time.now();
    switch (userStatuses.get(caller)) {
      case (?statuses) {
        let result = List.empty<StatusUpdate>();
        for (s in statuses.values()) {
          if (s.expiresAt > now) {
            result.add(s);
          };
        };
        result.toArray();
      };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func deleteStatus(statusId : Nat) : async () {
    requireAuth(caller);
    switch (userStatuses.get(caller)) {
      case (?statuses) {
        let updated = List.empty<StatusUpdate>();
        var found = false;
        for (s in statuses.values()) {
          if (s.id == statusId) {
            found := true;
          } else {
            updated.add(s);
          };
        };
        if (not found) {
          Runtime.trap("Status not found");
        };
        userStatuses.add(caller, updated);
      };
      case (null) { Runtime.trap("Status not found") };
    };
  };

  public shared ({ caller }) func reactToStatus(statusId : Nat, emoji : Text) : async () {
    requireAuth(caller);
    // Find the status across all users
    for ((author, statuses) in userStatuses.entries()) {
      let updated = List.empty<StatusUpdate>();
      var modified = false;
      for (s in statuses.values()) {
        if (s.id == statusId) {
          // Verify the status author is an accepted contact
          if (author != caller and not isAcceptedContact(caller, author)) {
            Runtime.trap("Cannot react to this status");
          };
          modified := true;
          let newReactions = List.empty<(Principal, Text)>();
          for (r in s.reactions.vals()) {
            if (r.0 != caller) {
              newReactions.add(r);
            };
          };
          newReactions.add((caller, emoji));
          updated.add({ s with reactions = newReactions.toArray() });
        } else {
          updated.add(s);
        };
      };
      if (modified) {
        userStatuses.add(author, updated);
        addNotification(author, #StatusReaction, null, ?caller);
        return;
      };
    };
    Runtime.trap("Status not found");
  };

  // Endpoints — Notifications

  public query ({ caller }) func getNotifications(limit : Nat) : async [Notification] {
    requireAuth(caller);
    let effectiveLimit = if (limit == 0 or limit > 100) { 50 } else { limit };
    switch (userNotifications.get(caller)) {
      case (?notifs) {
        let arr = notifs.toArray();
        // Return newest first, limited
        let result = List.empty<Notification>();
        var count = 0;
        var i = arr.size();
        while (i > 0 and count < effectiveLimit) {
          i -= 1;
          result.add(arr[i]);
          count += 1;
        };
        result.toArray();
      };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func markNotificationsRead(upToId : Nat) : async () {
    requireAuth(caller);
    switch (userNotifications.get(caller)) {
      case (?notifs) {
        let updated = List.empty<Notification>();
        for (n in notifs.values()) {
          if (n.id <= upToId and not n.read) {
            updated.add({ n with read = true });
          } else {
            updated.add(n);
          };
        };
        userNotifications.add(caller, updated);
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func toggleNotificationRead(notificationId : Nat) : async () {
    requireAuth(caller);
    switch (userNotifications.get(caller)) {
      case (?notifs) {
        let updated = List.empty<Notification>();
        for (n in notifs.values()) {
          if (n.id == notificationId) {
            updated.add({ n with read = not n.read });
          } else {
            updated.add(n);
          };
        };
        userNotifications.add(caller, updated);
      };
      case (null) {};
    };
  };

  public query ({ caller }) func getUnreadCount() : async Nat {
    requireAuth(caller);
    switch (userNotifications.get(caller)) {
      case (?notifs) {
        var count = 0;
        for (n in notifs.values()) {
          if (not n.read) {
            count += 1;
          };
        };
        count;
      };
      case (null) { 0 };
    };
  };

  // Endpoints — Disappearing Messages

  public shared ({ caller }) func setDisappearingTimer(conversationId : Nat, timer : DisappearingTimer) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    // For group conversations, only admin can change the timer
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            if (gi.admin != caller) {
              Runtime.trap("Only group admin can change the disappearing timer");
            };
          };
          case (null) {}; // Direct chat — either party can set it
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
    conversationTimers.add(conversationId, timer);
    cleanupExpiredMessages(conversationId);
  };

  public query ({ caller }) func getDisappearingTimer(conversationId : Nat) : async DisappearingTimer {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    switch (conversationTimers.get(conversationId)) {
      case (?t) { t };
      case (null) { #Off };
    };
  };

  // Endpoints — Typing Indicators

  public shared ({ caller }) func setTyping(conversationId : Nat) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    let convTyping = switch (typingIndicators.get(conversationId)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Principal, Int>();
        typingIndicators.add(conversationId, m);
        m;
      };
    };
    convTyping.add(caller, Time.now());
  };

  public query ({ caller }) func getTypingUsers(conversationId : Nat) : async [Principal] {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    let now = Time.now();
    let threshold = 5_000_000_000; // 5 seconds
    switch (typingIndicators.get(conversationId)) {
      case (?m) {
        let result = List.empty<Principal>();
        for ((p, ts) in m.entries()) {
          if (p != caller and now - ts < threshold) {
            result.add(p);
          };
        };
        result.toArray();
      };
      case (null) { [] };
    };
  };

  // Endpoints — vetKD

  public shared ({ caller }) func getVetKdPublicKey() : async Blob {
    requireAuth(caller);
    let result = await (with cycles = 26_153_846_153) vetKdApi.vetkd_public_key({
      canister_id = null;
      context = "email_config".encodeUtf8();
      key_id = { curve = #bls12_381_g2; name = VETKD_KEY_NAME };
    });
    result.public_key;
  };

  public shared ({ caller }) func getVetKey(transportPublicKey : Blob) : async Blob {
    requireAuth(caller);
    let result = await (with cycles = 26_153_846_153) vetKdApi.vetkd_derive_key({
      context = "email_config".encodeUtf8();
      input = caller.toBlob();
      key_id = { curve = #bls12_381_g2; name = VETKD_KEY_NAME };
      transport_public_key = transportPublicKey;
    });
    result.encrypted_key;
  };

  public shared ({ caller }) func setEncryptedEmailConfig(encryptedApiKey : Blob, senderEmail : Text) : async () {
    requireAuth(caller);
    if (encryptedApiKey.size() == 0) {
      Runtime.trap("Encrypted API key cannot be empty");
    };
    if (senderEmail == "") {
      Runtime.trap("Sender email cannot be empty");
    };
    if (senderEmail.size() > 320) {
      Runtime.trap("Sender email is too long");
    };
    userEncryptedEmailConfigs.add(caller, { encryptedApiKey; senderEmail });
  };

  public query ({ caller }) func getEncryptedEmailConfig() : async ?EncryptedEmailConfig {
    requireAuth(caller);
    userEncryptedEmailConfigs.get(caller);
  };

  // Endpoints — Email 2FA

  public shared ({ caller }) func requestEmailVerification(
    email : Text,
    apiKey : Text,
    senderEmail : Text,
  ) : async () {
    requireAuth(caller);
    if (email == "") {
      Runtime.trap("Email cannot be empty");
    };
    if (apiKey == "") {
      Runtime.trap("API key cannot be empty");
    };
    if (senderEmail == "") {
      Runtime.trap("Sender email cannot be empty");
    };
    let otp = await generateOtp();
    let expiry = Time.now() + 600_000_000_000; // 10 minutes
    pendingOtps.add(caller, { code = otp; email; expiry; attempts = 0 });
    let subject = "SecureChat Verification Code";
    let html = "<div style='font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px'><h2 style='color:#0f766e'>SecureChat</h2><p>Your verification code is:</p><div style='font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f0fdfa;border-radius:8px;color:#0f766e'>" # otp # "</div><p style='color:#666;font-size:14px;margin-top:16px'>This code expires in 10 minutes.</p></div>";
    let payload = buildEmailPayload(senderEmail, "SecureChat", email, subject, html);
    let headers : [OutCall.HttpHeader] = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # apiKey },
    ];
    ignore await OutCall.httpPostRequest(
      "https://api.resend.com/emails",
      headers,
      payload,
      transform,
    );
  };

  public shared ({ caller }) func verifyEmailOtp(code : Text) : async () {
    requireAuth(caller);
    switch (pendingOtps.get(caller)) {
      case (?otp) {
        if (Time.now() > otp.expiry) {
          pendingOtps.remove(caller);
          Runtime.trap("Verification code has expired");
        };
        if (otp.code != code) {
          let newAttempts = otp.attempts + 1;
          if (newAttempts >= MAX_OTP_ATTEMPTS) {
            pendingOtps.remove(caller);
            Runtime.trap("Too many failed attempts — request a new code");
          };
          pendingOtps.add(caller, { otp with attempts = newAttempts });
          Runtime.trap("Invalid verification code");
        };
        // Update profile with verified email
        switch (userProfiles.get(caller)) {
          case (?prof) {
            userProfiles.add(
              caller,
              {
                prof with email = ?otp.email;
                emailVerified = true;
                twoFactorEnabled = prof.twoFactorEnabled;
              },
            );
          };
          case (null) {
            Runtime.trap("Profile not found — set up profile first");
          };
        };
        pendingOtps.remove(caller);
      };
      case (null) {
        Runtime.trap("No pending verification — request a code first");
      };
    };
  };

  public query ({ caller }) func getEmailVerificationStatus() : async {
    email : ?Text;
    verified : Bool;
  } {
    requireAuth(caller);
    switch (userProfiles.get(caller)) {
      case (?prof) {
        { email = prof.email; verified = prof.emailVerified };
      };
      case (null) {
        { email = null; verified = false };
      };
    };
  };

  // Endpoints — Two-Factor Authentication

  public query ({ caller }) func getTwoFactorStatus() : async {
    enabled : Bool;
    emailVerified : Bool;
    email : ?Text;
  } {
    requireAuth(caller);
    switch (userProfiles.get(caller)) {
      case (?prof) {
        {
          enabled = prof.twoFactorEnabled;
          emailVerified = prof.emailVerified;
          email = prof.email;
        };
      };
      case (null) {
        { enabled = false; emailVerified = false; email = null };
      };
    };
  };

  public shared ({ caller }) func setTwoFactorEnabled(enabled : Bool) : async () {
    requireAuth(caller);
    switch (userProfiles.get(caller)) {
      case (?prof) {
        if (enabled and not prof.emailVerified) {
          Runtime.trap("Cannot enable 2FA without a verified email");
        };
        userProfiles.add(caller, { prof with twoFactorEnabled = enabled });
      };
      case (null) {
        Runtime.trap("Profile not found");
      };
    };
  };

  public shared ({ caller }) func requestLoginOtp(
    apiKey : Text,
    senderEmail : Text,
  ) : async () {
    requireAuth(caller);
    let prof = switch (userProfiles.get(caller)) {
      case (?p) { p };
      case (null) { Runtime.trap("Profile not found") };
    };
    if (not prof.twoFactorEnabled) {
      Runtime.trap("Two-factor authentication is not enabled");
    };
    let email = switch (prof.email) {
      case (?e) { e };
      case (null) { Runtime.trap("No verified email on file") };
    };
    if (apiKey == "") {
      Runtime.trap("API key cannot be empty");
    };
    if (senderEmail == "") {
      Runtime.trap("Sender email cannot be empty");
    };
    let otp = await generateOtp();
    let expiry = Time.now() + 600_000_000_000;
    pendingOtps.add(caller, { code = otp; email; expiry; attempts = 0 });
    let subject = "SecureChat Login Code";
    let html = "<div style='font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px'><h2 style='color:#0f766e'>SecureChat</h2><p>Your login verification code is:</p><div style='font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f0fdfa;border-radius:8px;color:#0f766e'>" # otp # "</div><p style='color:#666;font-size:14px;margin-top:16px'>This code expires in 10 minutes. If you did not request this, please ignore.</p></div>";
    let payload = buildEmailPayload(senderEmail, "SecureChat", email, subject, html);
    let headers : [OutCall.HttpHeader] = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # apiKey },
    ];
    ignore await OutCall.httpPostRequest(
      "https://api.resend.com/emails",
      headers,
      payload,
      transform,
    );
  };

  public shared ({ caller }) func verifyLoginOtp(code : Text) : async Bool {
    requireAuth(caller);
    switch (pendingOtps.get(caller)) {
      case (?otp) {
        if (Time.now() > otp.expiry) {
          pendingOtps.remove(caller);
          Runtime.trap("Verification code has expired");
        };
        if (otp.code != code) {
          let newAttempts = otp.attempts + 1;
          if (newAttempts >= MAX_OTP_ATTEMPTS) {
            pendingOtps.remove(caller);
            Runtime.trap("Too many failed attempts — request a new code");
          };
          pendingOtps.add(caller, { otp with attempts = newAttempts });
          Runtime.trap("Invalid verification code");
        };
        pendingOtps.remove(caller);
        true;
      };
      case (null) {
        Runtime.trap("No pending verification — request a code first");
      };
    };
  };

  // Endpoints — File Storage (from template)

  public shared ({ caller }) func uploadFile(
    name : Text,
    size : Nat64,
    fileType : Text,
    blob : Storage.ExternalBlob,
  ) : async FileMetadata {
    requireAuth(caller);
    if (name == "") {
      Runtime.trap("File name cannot be empty");
    };
    if (name.size() > MAX_FILE_NAME_LENGTH) {
      Runtime.trap("File name exceeds maximum length");
    };
    if (size > MAX_FILE_SIZE) {
      Runtime.trap("File exceeds maximum size of 10 MB");
    };
    let files = getUserFiles(caller);
    let fileId = genFileId(caller);
    let metadata : FileMetadata = {
      id = fileId;
      name;
      size;
      uploadDate = Time.now();
      fileType;
      blob;
    };
    files.add(fileId, metadata);
    metadata;
  };

  public query ({ caller }) func getAllFiles() : async [FileMetadata] {
    requireAuth(caller);
    getUserFiles(caller).values().toArray();
  };

  public query ({ caller }) func getFile(id : FileId) : async FileMetadata {
    requireAuth(caller);
    let files = getUserFiles(caller);
    switch (files.get(id)) {
      case (?file) { file };
      case (null) { Runtime.trap("File not found") };
    };
  };

  public shared ({ caller }) func deleteFile(id : FileId) : async () {
    requireAuth(caller);
    let files = getUserFiles(caller);
    if (not files.containsKey(id)) {
      Runtime.trap("File not found");
    };
    files.remove(id);
  };

  // E2EE endpoints

  public shared ({ caller }) func publishPublicKey(key : Blob) : async () {
    requireAuth(caller);
    if (key.size() == 0) {
      Runtime.trap("Key cannot be empty");
    };
    userPublicKeys.add(caller, key);
  };

  public query ({ caller }) func getPublicKey(principal : Principal) : async ?Blob {
    requireAuth(caller);
    userPublicKeys.get(principal);
  };

  public query ({ caller }) func getPublicKeys(principals : [Principal]) : async [(Principal, Blob)] {
    requireAuth(caller);
    let result = List.empty<(Principal, Blob)>();
    for (p in principals.vals()) {
      switch (userPublicKeys.get(p)) {
        case (?key) { result.add((p, key)) };
        case (null) {};
      };
    };
    result.toArray();
  };

  public shared ({ caller }) func publishGroupKeys(conversationId : Nat, wrappedKeys : [(Principal, Blob)]) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    // Only group admin can publish wrapped keys to prevent key substitution attacks
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            if (gi.admin != caller) {
              Runtime.trap("Only group admin can publish group keys");
            };
          };
          case (null) {
            Runtime.trap("publishGroupKeys is not supported for direct chats");
          };
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
    let keyMap = switch (conversationGroupKeys.get(conversationId)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Principal, WrappedGroupKey>();
        conversationGroupKeys.add(conversationId, m);
        m;
      };
    };
    for ((p, encKey) in wrappedKeys.vals()) {
      keyMap.add(p, { encryptedKey = encKey; wrappedBy = caller });
    };
  };

  public query ({ caller }) func getMyGroupKey(conversationId : Nat) : async ?WrappedGroupKey {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    switch (conversationGroupKeys.get(conversationId)) {
      case (?keyMap) { keyMap.get(caller) };
      case (null) { null };
    };
  };

  public shared ({ caller }) func clearGroupKeys(conversationId : Nat) : async () {
    requireAuth(caller);
    if (not isConversationMember(conversationId, caller)) {
      Runtime.trap("Not a member of this conversation");
    };
    // Only group admin can clear keys
    switch (conversations.get(conversationId)) {
      case (?conv) {
        switch (conv.groupInfo) {
          case (?gi) {
            if (gi.admin != caller) {
              Runtime.trap("Only group admin can clear keys");
            };
          };
          case (null) { Runtime.trap("Not a group conversation") };
        };
      };
      case (null) { Runtime.trap("Conversation not found") };
    };
    conversationGroupKeys.remove(conversationId);
  };



  // --- DTN Phase 2: WebRTC Signaling ---

  public shared func createSyncSession(offer : Text) : async Text {
    let sessionId = debug_show(nextSyncSessionId) # "-" # debug_show(Time.now());
    nextSyncSessionId += 1;
    let session : SyncSession = {
      offer = offer;
      var answer = null;
      createdAt = Time.now();
    };
    syncSessions.add(sessionId, session);
    sessionId
  };

  public shared func completeSyncSession(sessionId : Text, answer : Text) : async Bool {
    switch (syncSessions.get(sessionId)) {
      case (?session) {
        session.answer := ?answer;
        true
      };
      case null { false };
    }
  };

  public query func getSyncSession(sessionId : Text) : async ?(Text, ?Text) {
    switch (syncSessions.get(sessionId)) {
      case (?session) { ?(session.offer, session.answer) };
      case null { null };
    }
  };

};
